package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
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
			Success: false, ErrorMessage: fmt.Sprintf("Erro ao criar request: %v", err),
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
		errMsg := "Erro desconhecido"
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