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
		b, _ := io.ReadAll(resp.Body)
		respBody := string(b)
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
		varsMu.Unlock()

		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: resp.StatusCode,
			Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed,
			ResponseBody: respBody, ResponseHeaders: respHeaders,
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

	mainLoop:
	for _, step := range requests {
		select {
		case <-ctx.Done():
			break mainLoop
		default:
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
					executeSingleRequest(ctx, currentRd, sharedVars, &varsMu, logChan, success, errors, activeThreads)
				}(rd)
			}
			stepWg.Wait()
			continue
		}

		rd := step.LoadTestRequest
		isWorkflowStep := step.Type == "request" && rd.Duration <= 0
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
			if rd.Single || isWorkflowStep {
				targetRPS = 1
			}

			totalToFire := calculateTotalRequests(rd, targetRPS)
			var phaseWg sync.WaitGroup
			firingInterval := time.Duration(0)
			if targetRPS > 0 {
				firingInterval = time.Second / time.Duration(targetRPS)
			}

			startTimePhase := time.Now()
			rampUpDuration := time.Duration(rd.RampUp) * time.Second
			numRampRequests := (targetRPS * rd.RampUp) / 2

			for i := 0; i < totalToFire; i++ {
				select {
				case <-ctx.Done():
					break mainLoop
				default:
				}

				targetTime := calculateTargetTime(i, rd, targetRPS, numRampRequests, startTimePhase, rampUpDuration, firingInterval)
				if !targetTime.IsZero() {
					time.Sleep(time.Until(targetTime))
				}

				phaseWg.Add(1)
				allWorkersWg.Add(1)
				atomic.AddInt64(activeThreads, 1)

				go func(currentRd LoadTestRequest) {
					defer phaseWg.Done()
					defer allWorkersWg.Done()
					defer atomic.AddInt64(activeThreads, -1)
					executeSingleRequest(ctx, currentRd, sharedVars, &varsMu, logChan, success, errors, activeThreads)
				}(rd)
			}
			phaseWg.Wait()
		}
	}
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