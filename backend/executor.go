package main

import (
	"context"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        1000,
		MaxIdleConnsPerHost: 1000,
		IdleConnTimeout:     30 * time.Second,
	},
}

// truncateBody limita o tamanho do body nos logs para evitar consumo excessivo de memória
func truncateBody(body string, maxLen int) string {
	if len(body) <= maxLen {
		return body
	}
	return body[:maxLen] + "...[truncated]"
}

func executeSingleRequest(ctx context.Context, currentRd LoadTestRequest, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64) {
	varsMu.RLock()
	uT, bT := parseTemplate(currentRd.URL), parseTemplate(currentRd.Body)
	currentURL := executeTemplate(uT, sharedVars)
	currentBody := executeTemplate(bT, sharedVars)
	if !strings.HasPrefix(currentURL, "http") {
		currentURL = "http://" + currentURL
	}

	req, err := http.NewRequest(currentRd.Method, currentURL, strings.NewReader(currentBody))
	if err != nil {
		atomic.AddInt64(errors, 1)

		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: 0,
			Success: false, ErrorMessage: fmt.Sprintf("Error creating request: %v", err),
		}:
		}
		varsMu.RUnlock()
		return
	}

	// Captura os headers da requisição para o log
	sentHeaders := make(map[string]string)
	for k, v := range currentRd.Headers {
		val := executeTemplate(parseTemplate(v), sharedVars)
		req.Header.Set(k, val)
		sentHeaders[k] = val
	}
	varsMu.RUnlock()

	start := time.Now()
	resp, err := httpClient.Do(req)
	elapsed := time.Since(start).Milliseconds()

	if err == nil && resp != nil {
		// Determina se precisa ler o body da resposta
		needsBody := currentRd.CaptureBody
		if !needsBody {
			for _, a := range currentRd.Assertions {
				if a.Source == "body" { needsBody = true; break }
			}
		}
		if !needsBody {
			for _, e := range currentRd.Extractions {
				if e.Source == "body" { needsBody = true; break }
			}
		}

		var respBody string
		if needsBody {
			b, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
			respBody = string(b)
		} else {
			io.Copy(io.Discard, io.LimitReader(resp.Body, 8*1024)) // Drena até 8KB para reutilizar conexão
		}
		resp.Body.Close()

		// Captura os headers da resposta para o log
		respHeaders := make(map[string]string)
		for k, v := range resp.Header {
			respHeaders[k] = strings.Join(v, ", ")
		}

		valid, errMsg := validateResponse(resp, respBody, currentRd.Assertions)
		if valid {
			atomic.AddInt64(success, 1)
		} else {
			atomic.AddInt64(errors, 1)
		}

		varsMu.Lock()
		extractVars(resp, respBody, currentRd.Extractions, sharedVars)
		// Armazena metadados da última resposta para uso em condições de loop
		sharedVars["__last_status"] = strconv.Itoa(resp.StatusCode)
		sharedVars["__last_body"] = respBody
		for k, v := range resp.Header {
			sharedVars["__last_header_"+strings.ToLower(k)] = strings.Join(v, ", ")
		}
		varsMu.Unlock()

		logBody := ""
		if currentRd.CaptureBody {
			logBody = truncateBody(respBody, 2048)
		}

		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: resp.StatusCode,
			Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed,
			ResponseBody: logBody, ResponseHeaders: respHeaders,
			RequestBody: currentBody, RequestHeaders: sentHeaders,
			Success: valid, ErrorMessage: errMsg,
			RunningThreads: int(atomic.LoadInt64(activeThreads)),
		}:
		}
	} else {
		atomic.AddInt64(errors, 1)
		errMsg := "Unknown error"
		if err != nil {
			errMsg = err.Error()
		}

		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: 0,
			RequestBody: currentBody, RequestHeaders: sentHeaders,
			Success: false, ErrorMessage: errMsg,
			RunningThreads: int(atomic.LoadInt64(activeThreads)),
		}:
		}
	}
}

// orchestrateLoadTest manages execution phases (ramp-up, parallel, sequential) and closes the log channel when finished.
func orchestrateLoadTest(ctx context.Context, payloadLoadTestRequest LoadTestRequest, payloadRequests []WorkflowStep, initialVariables map[string]string, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64) {
	var allWorkersWg sync.WaitGroup

	requests := payloadRequests
	if len(requests) == 0 {
		requests = []WorkflowStep{{Type: "request", LoadTestRequest: payloadLoadTestRequest}}
	}

	sharedVars := make(map[string]string)
	for k, v := range initialVariables {
		sharedVars[k] = v
	}
	var varsMu sync.RWMutex

	defer func() {
		allWorkersWg.Wait()
		close(logChan)
	}()

	executeSteps(ctx, requests, sharedVars, &varsMu, logChan, success, errors, activeThreads, &allWorkersWg)
}

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