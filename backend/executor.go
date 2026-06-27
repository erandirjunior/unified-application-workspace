package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

func executeSingleRequest(ctx context.Context, currentRd LoadTestRequest, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64) {
	executeSingleRequestWithClient(ctx, httpClient, currentRd, sharedVars, varsMu, logChan, success, errors, activeThreads)
}

func executeSingleRequestWithClient(ctx context.Context, client *http.Client, currentRd LoadTestRequest, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64) {
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
	resp, err := client.Do(req)
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
