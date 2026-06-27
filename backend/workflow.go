package main

import (
	"context"
	"math"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// executeSteps runs a slice of workflow steps sequentially. Returns false if ctx was cancelled.
func executeSteps(ctx context.Context, steps []WorkflowStep, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64, allWorkersWg *sync.WaitGroup) bool {
	for _, step := range steps {
		select {
		case <-ctx.Done():
			return false
		default:
		}

		if step.Type == "loop" {
			if !executeLoopStep(ctx, step, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg) {
				return false
			}
			continue
		}

		if step.Type == "condition" {
			if !executeConditionStep(ctx, step, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg) {
				return false
			}
			continue
		}

		if step.Type == "parallel" {
			var stepWg sync.WaitGroup
			for _, rd := range step.Requests {
				stepWg.Add(1)
				allWorkersWg.Add(1)
				atomic.AddInt64(activeThreads, 1)
				go func(currentRd LoadTestRequest) {
					defer stepWg.Done()
					defer allWorkersWg.Done()
					defer atomic.AddInt64(activeThreads, -1)
					executeSingleRequest(ctx, currentRd, sharedVars, varsMu, logChan, success, errors, activeThreads)
				}(rd)
			}
			stepWg.Wait()
			continue
		}

		rd := step.LoadTestRequest
		if step.Type == "" && rd.URL != "" {
			step.Type = "request"
		}

		if strings.ToLower(rd.Method) == "wait" || step.Type == "wait" {
			waitSec, _ := strconv.Atoi(rd.URL)
			time.Sleep(time.Duration(waitSec) * time.Second)
			continue
		}

		if rd.URL != "" {
			// Modo Workers: N goroutines disparando continuamente durante a duração
			if strings.ToLower(rd.Mode) == "workers" {
				numWorkers := rd.Workers
				if numWorkers <= 0 {
					numWorkers = 10
				}
				durationSec := rd.Duration
				if durationSec <= 0 {
					durationSec = 10
				}
				totalDuration := time.Duration(durationSec) * time.Second
				rampUpSec := rd.RampUp
				if rampUpSec < 0 {
					rampUpSec = 0
				}

				workerCtx, workerCancel := context.WithTimeout(ctx, totalDuration)

				var phaseWg sync.WaitGroup

				if rampUpSec > 0 && rampUpSec < durationSec {
					// Ramp-up: adiciona workers gradualmente ao longo do período
					rampInterval := time.Duration(rampUpSec) * time.Second / time.Duration(numWorkers)
					for w := 0; w < numWorkers; w++ {
						select {
						case <-workerCtx.Done():
							break
						default:
						}
						if w > 0 {
							time.Sleep(rampInterval)
						}
						phaseWg.Add(1)
						allWorkersWg.Add(1)
						atomic.AddInt64(activeThreads, 1)
						go func(currentRd LoadTestRequest) {
							defer phaseWg.Done()
							defer allWorkersWg.Done()
							defer atomic.AddInt64(activeThreads, -1)
							workerClient := newWorkerClient()
							for {
								select {
								case <-workerCtx.Done():
									return
								default:
									executeSingleRequestWithClient(workerCtx, workerClient, currentRd, sharedVars, varsMu, logChan, success, errors, activeThreads)
								}
							}
						}(rd)
					}
				} else {
					// Sem ramp-up: todos os workers iniciam imediatamente
					for w := 0; w < numWorkers; w++ {
						phaseWg.Add(1)
						allWorkersWg.Add(1)
						atomic.AddInt64(activeThreads, 1)
						go func(currentRd LoadTestRequest) {
							defer phaseWg.Done()
							defer allWorkersWg.Done()
							defer atomic.AddInt64(activeThreads, -1)
							workerClient := newWorkerClient()
							for {
								select {
								case <-workerCtx.Done():
									return
								default:
									executeSingleRequestWithClient(workerCtx, workerClient, currentRd, sharedVars, varsMu, logChan, success, errors, activeThreads)
								}
							}
						}(rd)
					}
				}

				phaseWg.Wait()
				workerCancel()

				select {
				case <-ctx.Done():
					return false
				default:
				}
			} else {
				// Modo RPS (padrão): disparo controlado por taxa
				targetRPS := rd.TotalRequests
				if rd.Single {
					targetRPS = 1
				}

				totalToFire := calculateTotalRequests(rd, targetRPS)
				durationSec := rd.Duration
				if durationSec <= 0 {
					durationSec = 1
				}

				startTimePhase := time.Now()
				rampUpDuration := time.Duration(rd.RampUp) * time.Second
				totalDuration := time.Duration(durationSec) * time.Second
				interval := time.Duration(0)
				if targetRPS > 0 {
					interval = time.Second / time.Duration(targetRPS)
				}

				var phaseWg sync.WaitGroup
				cancelled := false

				for i := 0; i < totalToFire; i++ {
					select {
					case <-ctx.Done():
						cancelled = true
					default:
					}
					if cancelled {
						break
					}

					// Calcula o timestamp absoluto em que a request i deve ser disparada
					var targetTime time.Time
					if rampUpDuration > 0 && i < (targetRPS*rd.RampUp)/2 {
						// Durante ramp-up: aceleração quadrática
						t := math.Sqrt(2.0 * float64(rd.RampUp) * float64(i) / float64(targetRPS))
						targetTime = startTimePhase.Add(time.Duration(t * float64(time.Second)))
					} else {
						// Após ramp-up: intervalo constante
						rampRequests := (targetRPS * rd.RampUp) / 2
						offsetAfterRamp := i - rampRequests
						if offsetAfterRamp < 0 {
							offsetAfterRamp = 0
						}
						targetTime = startTimePhase.Add(rampUpDuration + time.Duration(int64(offsetAfterRamp))*interval)
					}

					// Verifica se excedeu a duração
					if targetTime.Sub(startTimePhase) >= totalDuration {
						break
					}

					// Espera até o momento exato (timestamp absoluto)
					now := time.Now()
					if targetTime.After(now) {
						time.Sleep(targetTime.Sub(now))
					}

					phaseWg.Add(1)
					allWorkersWg.Add(1)
					atomic.AddInt64(activeThreads, 1)

					go func(currentRd LoadTestRequest) {
						defer phaseWg.Done()
						defer allWorkersWg.Done()
						defer atomic.AddInt64(activeThreads, -1)
						executeSingleRequest(ctx, currentRd, sharedVars, varsMu, logChan, success, errors, activeThreads)
					}(rd)
				}
				phaseWg.Wait()
				if cancelled {
					return false
				}
			}
		}
	}
	return true
}

// executeLoopStep executes the inner steps repeatedly while the loop condition is met.
func executeLoopStep(ctx context.Context, step WorkflowStep, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64, allWorkersWg *sync.WaitGroup) bool {
	cond := step.Loop
	if cond == nil || len(step.Steps) == 0 {
		return true
	}

	maxIter := cond.MaxIter
	if maxIter <= 0 {
		maxIter = 100
	}

	for iteration := 0; iteration < maxIter; iteration++ {
		select {
		case <-ctx.Done():
			return false
		default:
		}

		if !executeSteps(ctx, step.Steps, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg) {
			return false
		}

		varsMu.RLock()
		shouldContinue := evaluateLoopCondition(cond, sharedVars)
		varsMu.RUnlock()

		if !shouldContinue {
			break
		}
	}
	return true
}

// executeConditionStep evaluates a condition and runs the appropriate branch.
func executeConditionStep(ctx context.Context, step WorkflowStep, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64, allWorkersWg *sync.WaitGroup) bool {
	cond := step.Condition
	if cond == nil {
		// Sem condição, executa o branch "then" por padrão
		if len(step.Steps) > 0 {
			return executeSteps(ctx, step.Steps, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg)
		}
		return true
	}

	varsMu.RLock()
	conditionMet := evaluateLoopCondition(cond, sharedVars)
	varsMu.RUnlock()

	if conditionMet {
		if len(step.Steps) > 0 {
			return executeSteps(ctx, step.Steps, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg)
		}
	} else {
		if len(step.ElseSteps) > 0 {
			return executeSteps(ctx, step.ElseSteps, sharedVars, varsMu, logChan, success, errors, activeThreads, allWorkersWg)
		}
	}
	return true
}

// evaluateLoopCondition checks if the loop should continue based on the condition and shared variables.
func evaluateLoopCondition(cond *LoopCondition, vars map[string]string) bool {
	// Avalia a condição principal
	mainResult := evaluateSingleCondition(cond, vars)

	// Se não tem condições adicionais, retorna o resultado da principal
	if len(cond.Conditions) == 0 {
		return mainResult
	}

	// Combina com condições adicionais usando lógica AND/OR
	logic := strings.ToLower(cond.Logic)
	if logic == "" {
		logic = "and"
	}

	if logic == "and" {
		if !mainResult {
			return false
		}
		for _, sub := range cond.Conditions {
			if !evaluateSingleCondition(&sub, vars) {
				return false
			}
		}
		return true
	}

	// OR
	if mainResult {
		return true
	}
	for _, sub := range cond.Conditions {
		if evaluateSingleCondition(&sub, vars) {
			return true
		}
	}
	return false
}

// evaluateSingleCondition evaluates one condition rule against the shared variables.
func evaluateSingleCondition(cond *LoopCondition, vars map[string]string) bool {
	var actual string

	switch cond.Source {
	case "variable":
		actual = vars[cond.Property]
	case "status":
		actual = vars["__last_status"]
	case "body":
		lastBody := vars["__last_body"]
		if cond.Property != "" {
			val, err := getJsonValue(lastBody, cond.Property)
			if err != nil {
				return false
			}
			actual = val
		} else {
			actual = lastBody
		}
	case "header":
		actual = vars["__last_header_"+strings.ToLower(cond.Property)]
	default:
		return false
	}

	switch cond.Operator {
	case "==":
		return actual == cond.Target
	case "!=":
		return actual != cond.Target
	case "contains":
		return strings.Contains(actual, cond.Target)
	case "exists":
		return actual != ""
	case "not_exists":
		return actual == ""
	case ">", ">=", "<", "<=":
		vActual, err1 := strconv.ParseFloat(actual, 64)
		vTarget, err2 := strconv.ParseFloat(cond.Target, 64)
		if err1 != nil || err2 != nil {
			return false
		}
		switch cond.Operator {
		case ">":
			return vActual > vTarget
		case ">=":
			return vActual >= vTarget
		case "<":
			return vActual < vTarget
		case "<=":
			return vActual <= vTarget
		}
	}
	return false
}

func calculateTotalRequests(rd LoadTestRequest, targetRPS int) int {
	if rd.Duration > 0 && !rd.Single {
		if rd.RampUp > 0 && rd.RampUp < rd.Duration {
			rampReqs := (targetRPS * rd.RampUp) / 2
			stableReqs := targetRPS * (rd.Duration - rd.RampUp)
			return rampReqs + stableReqs
		}
		return targetRPS * rd.Duration
	}
	return targetRPS
}

func calculateTargetTime(i int, rd LoadTestRequest, targetRPS int, numRampRequests int, startTimePhase time.Time, rampUpDuration time.Duration, firingInterval time.Duration) time.Time {
	if rd.RampUp > 0 && i < numRampRequests {
		t := math.Sqrt(2.0 * float64(rd.RampUp) * float64(i) / float64(targetRPS))
		return startTimePhase.Add(time.Duration(t * float64(time.Second)))
	} else if rd.RampUp > 0 && !rd.Single {
		offsetStable := float64(i-numRampRequests) / float64(targetRPS)
		return startTimePhase.Add(rampUpDuration).Add(time.Duration(offsetStable * float64(time.Second)))
	} else if firingInterval > 0 {
		return startTimePhase.Add(time.Duration(i) * firingInterval)
	}
	return time.Time{}
}
