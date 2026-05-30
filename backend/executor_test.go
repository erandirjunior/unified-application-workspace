package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestCalculateTotalRequests(t *testing.T) {
	tests := []struct {
		name      string
		rd        LoadTestRequest
		targetRPS int
		expected  int
	}{
		{"Single request", LoadTestRequest{Single: true}, 10, 10},
		{"Constant duration", LoadTestRequest{Duration: 10}, 5, 50},
		{"Ramp up phase", LoadTestRequest{Duration: 10, RampUp: 4}, 10, 80}, // (10*4)/2 + 10*(10-4) = 20 + 60 = 80
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateTotalRequests(tt.rd, tt.targetRPS)
			if got != tt.expected {
				t.Errorf("calculateTotalRequests() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestCalculateTargetTime(t *testing.T) {
	startTime := time.Now()
	rd := LoadTestRequest{RampUp: 0}
	targetRPS := 10
	firingInterval := time.Second / time.Duration(targetRPS)

	t.Run("Constant RPS calculation", func(t *testing.T) {
		// Request index 5 should be exactly 500ms after start
		got := calculateTargetTime(5, rd, targetRPS, 0, startTime, 0, firingInterval)
		expected := startTime.Add(500 * time.Millisecond)
		if !got.Equal(expected) {
			t.Errorf("calculateTargetTime() = %v, want %v", got, expected)
		}
	})

	t.Run("Ramp up timing calculation", func(t *testing.T) {
		rdRamp := LoadTestRequest{RampUp: 10}
		// Test first request in ramp up
		got := calculateTargetTime(0, rdRamp, 100, 500, startTime, 10*time.Second, 10*time.Millisecond)
		if !got.Equal(startTime) { t.Errorf("Expected startTime, got %v", got) }
	})

	t.Run("Zero interval returns zero time", func(t *testing.T) {
		got := calculateTargetTime(1, rd, 0, 0, startTime, 0, 0)
		if !got.IsZero() {
			t.Errorf("Expected zero time, got %v", got)
		}
	})
}

func TestExecuteSingleRequestIntegration(t *testing.T) {
	// Setup a mock server to receive the request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Response-Test", "ok")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success"}`))
	}))
	defer server.Close()

	ctx := context.Background()
	rd := LoadTestRequest{
		URL:    server.URL,
		Method: "POST",
		Body:   "test-body",
		Assertions: []Assertion{
			{Source: "status", Operator: "==", Target: "200"},
		},
		Extractions: []Extraction{
			{Source: "header", Property: "X-Response-Test", VarName: "resVar"},
		},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64

	executeSingleRequest(ctx, rd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)

	if success != 1 {
		t.Errorf("Expected 1 success, got %d", success)
	}
	if sharedVars["resVar"] != "ok" {
		t.Errorf("Expected extraction resVar=ok, got %s", sharedVars["resVar"])
	}
	
	entry := <-logChan
	if entry.StatusCode != 200 {
		t.Errorf("Expected log status 200, got %d", entry.StatusCode)
	}
}

func TestExecuteSingleRequest_Error(t *testing.T) {
	ctx := context.Background()
	// Invalid URL to trigger NewRequest error (e.g., space in URL)
	rd := LoadTestRequest{
		URL:    "http://invalid url with spaces",
		Method: "GET",
	}

	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64
	var varsMu sync.RWMutex

	executeSingleRequest(ctx, rd, nil, &varsMu, logChan, &success, &errors, &activeThreads)

	if errors != 1 {
		t.Errorf("Expected 1 error count, got %d", errors)
	}
	entry := <-logChan
	if entry.Success != false || entry.ErrorMessage == "" {
		t.Error("Expected failure log entry with error message")
	}
}

func TestOrchestrateLoadTestComplex(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Define a workflow with parallel and wait steps
	steps := []WorkflowStep{
		{
			Type: "parallel",
			Requests: []LoadTestRequest{
				{URL: server.URL, Method: "GET"},
				{URL: server.URL, Method: "GET"},
			},
		},
		{
			Type:            "wait",
			LoadTestRequest: LoadTestRequest{URL: "1"}, // 1 second wait
		},
	}

	logChan := make(chan RequestLogEntry, 10)
	var success, errors, activeThreads int64

	// Running the orchestrator
	orchestrateLoadTest(ctx, LoadTestRequest{}, steps, nil, logChan, &success, &errors, &activeThreads)

	if success != 2 {
		t.Errorf("Expected 2 successful requests from parallel step, got %d", success)
	}
}

func TestOrchestrateLoadTest_RampUp(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rd := LoadTestRequest{
		URL:           server.URL,
		Method:        "GET",
		TotalRequests: 10,
		Duration:      2,
		RampUp:        1,
	}

	logChan := make(chan RequestLogEntry, 20)
	var success, errors, activeThreads int64
	orchestrateLoadTest(ctx, rd, nil, nil, logChan, &success, &errors, &activeThreads)
	
	if success == 0 {
		t.Error("Expected successful requests in ramp-up test")
	}
}