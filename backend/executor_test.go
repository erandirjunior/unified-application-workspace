package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
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


func TestExecuteLoopStep(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"count": 1}`))
	}))
	defer server.Close()

	t.Run("Nil loop condition returns true", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{Type: "loop", Loop: nil, Steps: nil}
		sharedVars := make(map[string]string)
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		result := executeLoopStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		if !result {
			t.Error("Expected true for nil loop condition")
		}
	})

	t.Run("Loop with maxIter", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "loop",
			Loop: &LoopCondition{
				Source:   "variable",
				Property: "counter",
				Operator: "==",
				Target:   "running",
				MaxIter:  3,
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		sharedVars := map[string]string{"counter": "running"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 100)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		executeLoopStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		if atomic.LoadInt64(&success) != 3 {
			t.Errorf("Expected 3 iterations, got %d successes", atomic.LoadInt64(&success))
		}
	})

	t.Run("Loop exits on condition false", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "loop",
			Loop: &LoopCondition{
				Source:   "variable",
				Property: "counter",
				Operator: "==",
				Target:   "never_match",
				MaxIter:  10,
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		sharedVars := map[string]string{"counter": "different"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 100)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		executeLoopStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		// Should execute steps once, then evaluate condition (false), break
		if atomic.LoadInt64(&success) != 1 {
			t.Errorf("Expected 1 iteration before condition failed, got %d", atomic.LoadInt64(&success))
		}
	})

	t.Run("Loop cancelled by context", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // cancel immediately

		step := WorkflowStep{
			Type: "loop",
			Loop: &LoopCondition{
				Source:   "variable",
				Property: "x",
				Operator: "==",
				Target:   "y",
				MaxIter:  100,
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		sharedVars := map[string]string{"x": "y"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 100)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		result := executeLoopStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		if result {
			t.Error("Expected false when context is cancelled")
		}
	})

	t.Run("Loop default maxIter when 0", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "loop",
			Loop: &LoopCondition{
				Source:   "variable",
				Property: "x",
				Operator: "!=",
				Target:   "stop",
				MaxIter:  0, // should default to 100
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		// Condition is != "stop", var is "go", so loop continues until maxIter
		sharedVars := map[string]string{"x": "stop"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 200)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		executeLoopStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		// x == "stop" and operator is !=, so condition is false after first iteration
		if atomic.LoadInt64(&success) != 1 {
			t.Errorf("Expected 1 iteration, got %d", atomic.LoadInt64(&success))
		}
	})
}

func TestExecuteConditionStep(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	t.Run("Nil condition executes then steps", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type:      "condition",
			Condition: nil,
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		sharedVars := make(map[string]string)
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		result := executeConditionStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		if !result {
			t.Error("Expected true")
		}
		if atomic.LoadInt64(&success) != 1 {
			t.Errorf("Expected 1 success, got %d", atomic.LoadInt64(&success))
		}
	})

	t.Run("Nil condition no steps", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{Type: "condition", Condition: nil, Steps: nil}

		sharedVars := make(map[string]string)
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		result := executeConditionStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		if !result {
			t.Error("Expected true for nil condition with no steps")
		}
	})

	t.Run("Condition true executes then branch", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "condition",
			Condition: &LoopCondition{
				Source:   "variable",
				Property: "env",
				Operator: "==",
				Target:   "prod",
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
			ElseSteps: []WorkflowStep{},
		}

		sharedVars := map[string]string{"env": "prod"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		result := executeConditionStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		if !result {
			t.Error("Expected true")
		}
		if atomic.LoadInt64(&success) != 1 {
			t.Errorf("Expected 1 success from then branch, got %d", atomic.LoadInt64(&success))
		}
	})

	t.Run("Condition false executes else branch", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "condition",
			Condition: &LoopCondition{
				Source:   "variable",
				Property: "env",
				Operator: "==",
				Target:   "prod",
			},
			Steps: []WorkflowStep{},
			ElseSteps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
		}

		sharedVars := map[string]string{"env": "staging"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		go func() {
			for range logChan {
			}
		}()

		result := executeConditionStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		wg.Wait()
		close(logChan)

		if !result {
			t.Error("Expected true")
		}
		if atomic.LoadInt64(&success) != 1 {
			t.Errorf("Expected 1 success from else branch, got %d", atomic.LoadInt64(&success))
		}
	})

	t.Run("Condition false no else steps", func(t *testing.T) {
		ctx := context.Background()
		step := WorkflowStep{
			Type: "condition",
			Condition: &LoopCondition{
				Source:   "variable",
				Property: "env",
				Operator: "==",
				Target:   "prod",
			},
			Steps: []WorkflowStep{
				{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
			},
			ElseSteps: nil,
		}

		sharedVars := map[string]string{"env": "dev"}
		var varsMu sync.RWMutex
		logChan := make(chan RequestLogEntry, 10)
		var success, errors, activeThreads int64
		var wg sync.WaitGroup

		result := executeConditionStep(ctx, step, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
		if !result {
			t.Error("Expected true")
		}
		if atomic.LoadInt64(&success) != 0 {
			t.Errorf("Expected 0 successes (no branch executed), got %d", atomic.LoadInt64(&success))
		}
	})
}

func TestEvaluateLoopCondition(t *testing.T) {
	t.Run("Simple condition true", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "==", Target: "hello"}
		vars := map[string]string{"x": "hello"}
		if !evaluateLoopCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Simple condition false", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "==", Target: "hello"}
		vars := map[string]string{"x": "world"}
		if evaluateLoopCondition(cond, vars) {
			t.Error("Expected false")
		}
	})

	t.Run("AND logic all true", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "and",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "1", "b": "2"}
		if !evaluateLoopCondition(cond, vars) {
			t.Error("Expected true for AND with all true")
		}
	})

	t.Run("AND logic main false", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "and",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "wrong", "b": "2"}
		if evaluateLoopCondition(cond, vars) {
			t.Error("Expected false for AND with main false")
		}
	})

	t.Run("AND logic sub false", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "and",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "1", "b": "wrong"}
		if evaluateLoopCondition(cond, vars) {
			t.Error("Expected false for AND with sub false")
		}
	})

	t.Run("OR logic main true", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "or",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "1", "b": "wrong"}
		if !evaluateLoopCondition(cond, vars) {
			t.Error("Expected true for OR with main true")
		}
	})

	t.Run("OR logic sub true", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "or",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "wrong", "b": "2"}
		if !evaluateLoopCondition(cond, vars) {
			t.Error("Expected true for OR with sub true")
		}
	})

	t.Run("OR logic all false", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "or",
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "wrong", "b": "wrong"}
		if evaluateLoopCondition(cond, vars) {
			t.Error("Expected false for OR with all false")
		}
	})

	t.Run("Default logic is AND", func(t *testing.T) {
		cond := &LoopCondition{
			Source: "variable", Property: "a", Operator: "==", Target: "1",
			Logic: "", // defaults to "and"
			Conditions: []LoopCondition{
				{Source: "variable", Property: "b", Operator: "==", Target: "2"},
			},
		}
		vars := map[string]string{"a": "1", "b": "wrong"}
		if evaluateLoopCondition(cond, vars) {
			t.Error("Expected false for default AND logic with sub false")
		}
	})
}

func TestEvaluateSingleCondition(t *testing.T) {
	t.Run("Variable source", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "token", Operator: "==", Target: "abc"}
		vars := map[string]string{"token": "abc"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Status source", func(t *testing.T) {
		cond := &LoopCondition{Source: "status", Operator: "==", Target: "200"}
		vars := map[string]string{"__last_status": "200"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Body source with property", func(t *testing.T) {
		cond := &LoopCondition{Source: "body", Property: "name", Operator: "==", Target: "test"}
		vars := map[string]string{"__last_body": `{"name":"test"}`}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Body source without property", func(t *testing.T) {
		cond := &LoopCondition{Source: "body", Property: "", Operator: "contains", Target: "hello"}
		vars := map[string]string{"__last_body": `hello world`}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Body source with invalid JSON path", func(t *testing.T) {
		cond := &LoopCondition{Source: "body", Property: "nonexistent", Operator: "==", Target: "x"}
		vars := map[string]string{"__last_body": `{"name":"test"}`}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for invalid json path")
		}
	})

	t.Run("Header source", func(t *testing.T) {
		cond := &LoopCondition{Source: "header", Property: "Content-Type", Operator: "contains", Target: "json"}
		vars := map[string]string{"__last_header_content-type": "application/json"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true")
		}
	})

	t.Run("Unknown source", func(t *testing.T) {
		cond := &LoopCondition{Source: "unknown", Property: "x", Operator: "==", Target: "y"}
		vars := map[string]string{}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for unknown source")
		}
	})

	t.Run("Operator !=", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "!=", Target: "a"}
		vars := map[string]string{"x": "b"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for !=")
		}
	})

	t.Run("Operator contains", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "msg", Operator: "contains", Target: "err"}
		vars := map[string]string{"msg": "error occurred"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for contains")
		}
	})

	t.Run("Operator exists", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "exists"}
		vars := map[string]string{"x": "something"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for exists")
		}
	})

	t.Run("Operator exists false", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "exists"}
		vars := map[string]string{"x": ""}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for exists on empty")
		}
	})

	t.Run("Operator not_exists", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "not_exists"}
		vars := map[string]string{"x": ""}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for not_exists on empty")
		}
	})

	t.Run("Numeric >", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: ">", Target: "5"}
		vars := map[string]string{"n": "10"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for >")
		}
	})

	t.Run("Numeric >=", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: ">=", Target: "10"}
		vars := map[string]string{"n": "10"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for >=")
		}
	})

	t.Run("Numeric <", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: "<", Target: "20"}
		vars := map[string]string{"n": "10"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for <")
		}
	})

	t.Run("Numeric <=", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: "<=", Target: "10"}
		vars := map[string]string{"n": "10"}
		if !evaluateSingleCondition(cond, vars) {
			t.Error("Expected true for <=")
		}
	})

	t.Run("Numeric comparison invalid actual", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: ">", Target: "5"}
		vars := map[string]string{"n": "abc"}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for non-numeric actual")
		}
	})

	t.Run("Numeric comparison invalid target", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "n", Operator: ">", Target: "abc"}
		vars := map[string]string{"n": "10"}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for non-numeric target")
		}
	})

	t.Run("Unknown operator", func(t *testing.T) {
		cond := &LoopCondition{Source: "variable", Property: "x", Operator: "~", Target: "y"}
		vars := map[string]string{"x": "y"}
		if evaluateSingleCondition(cond, vars) {
			t.Error("Expected false for unknown operator")
		}
	})
}

func TestExecuteSteps_ContextCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	steps := []WorkflowStep{
		{Type: "request", LoadTestRequest: LoadTestRequest{URL: "http://localhost", Method: "GET", Single: true, TotalRequests: 1}},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 10)
	var success, errors, activeThreads int64
	var wg sync.WaitGroup

	result := executeSteps(ctx, steps, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
	if result {
		t.Error("Expected false when context is cancelled")
	}
}

func TestExecuteSteps_WaitStep(t *testing.T) {
	ctx := context.Background()
	steps := []WorkflowStep{
		{Type: "wait", LoadTestRequest: LoadTestRequest{URL: "0", Method: "wait"}},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 10)
	var success, errors, activeThreads int64
	var wg sync.WaitGroup

	start := time.Now()
	result := executeSteps(ctx, steps, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads, &wg)
	elapsed := time.Since(start)

	if !result {
		t.Error("Expected true")
	}
	if elapsed > 1*time.Second {
		t.Error("Wait step with 0 seconds should be very fast")
	}
}

func TestOrchestrateLoadTest_WithVariables(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"result":"ok"}`))
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	steps := []WorkflowStep{
		{Type: "request", LoadTestRequest: LoadTestRequest{URL: server.URL, Method: "GET", Single: true, TotalRequests: 1}},
	}

	initialVars := map[string]string{"baseUrl": server.URL}
	logChan := make(chan RequestLogEntry, 10)
	var success, errors, activeThreads int64

	orchestrateLoadTest(ctx, LoadTestRequest{}, steps, initialVars, logChan, &success, &errors, &activeThreads)

	if atomic.LoadInt64(&success) != 1 {
		t.Errorf("Expected 1 success, got %d", atomic.LoadInt64(&success))
	}
}


func TestExecuteSingleRequest_HttpError(t *testing.T) {
	// Use an unreachable address to trigger an HTTP-level error (not a request creation error)
	ctx := context.Background()
	rd := LoadTestRequest{
		URL:    "http://127.0.0.1:1", // port 1 is almost certainly closed
		Method: "GET",
		Headers: map[string]string{"X-Test": "value"},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64

	executeSingleRequest(ctx, rd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)

	if atomic.LoadInt64(&errors) != 1 {
		t.Errorf("Expected 1 error, got %d", atomic.LoadInt64(&errors))
	}
	entry := <-logChan
	if entry.Success {
		t.Error("Expected failure")
	}
	if entry.ErrorMessage == "" {
		t.Error("Expected error message")
	}
	if entry.RequestHeaders["X-Test"] != "value" {
		t.Errorf("Expected request header X-Test=value in log, got %v", entry.RequestHeaders)
	}
}

func TestExecuteSingleRequest_AutoPrefixHttp(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer server.Close()

	// Strip "http://" from server URL so the auto-prefix kicks in
	urlNoScheme := strings.TrimPrefix(server.URL, "http://")

	ctx := context.Background()
	rd := LoadTestRequest{
		URL:    urlNoScheme,
		Method: "GET",
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64

	executeSingleRequest(ctx, rd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)

	if atomic.LoadInt64(&success) != 1 {
		t.Errorf("Expected 1 success with auto http prefix, got %d successes and %d errors", atomic.LoadInt64(&success), atomic.LoadInt64(&errors))
	}
}

func TestExecuteSingleRequest_FailedAssertions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"fail"}`))
	}))
	defer server.Close()

	ctx := context.Background()
	rd := LoadTestRequest{
		URL:    server.URL,
		Method: "GET",
		Assertions: []Assertion{
			{Source: "body", Property: "status", Operator: "==", Target: "success"},
		},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64

	executeSingleRequest(ctx, rd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)

	if atomic.LoadInt64(&errors) != 1 {
		t.Errorf("Expected 1 error from failed assertion, got %d", atomic.LoadInt64(&errors))
	}
	entry := <-logChan
	if entry.Success {
		t.Error("Expected failure in log entry")
	}
}

func TestExecuteSingleRequest_WithHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token123" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("X-Custom", "response-val")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	ctx := context.Background()
	rd := LoadTestRequest{
		URL:     server.URL,
		Method:  "GET",
		Headers: map[string]string{"Authorization": "Bearer token123"},
		Extractions: []Extraction{
			{Source: "header", Property: "X-Custom", VarName: "custom"},
		},
	}

	sharedVars := make(map[string]string)
	var varsMu sync.RWMutex
	logChan := make(chan RequestLogEntry, 1)
	var success, errors, activeThreads int64

	executeSingleRequest(ctx, rd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)

	if atomic.LoadInt64(&success) != 1 {
		t.Errorf("Expected 1 success, got %d", atomic.LoadInt64(&success))
	}
	if sharedVars["custom"] != "response-val" {
		t.Errorf("Expected extraction custom=response-val, got %s", sharedVars["custom"])
	}
	if sharedVars["__last_status"] != "200" {
		t.Errorf("Expected __last_status=200, got %s", sharedVars["__last_status"])
	}
}
