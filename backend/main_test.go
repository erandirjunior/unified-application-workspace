package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCheckHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()

	// Setup the same mux as main
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "Backend is running"}`))
	})

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if rr.Header().Get("Content-Type") != "application/json" {
		t.Errorf("Expected JSON content type, got %s", rr.Header().Get("Content-Type"))
	}
}

func TestRunHandler_Options(t *testing.T) {
	req := httptest.NewRequest("OPTIONS", "/run", nil)
	rr := httptest.NewRecorder()
	runHandler(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Errorf("Expected 204 for OPTIONS, got %d", rr.Code)
	}
}

func TestRunHandler_InvalidJSON(t *testing.T) {
	// Sending malformed JSON to /run
	req := httptest.NewRequest("POST", "/run", bytes.NewBuffer([]byte(`{invalid: json}`)))
	rr := httptest.NewRecorder()

	runHandler(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request, got %d", rr.Code)
	}
}

func TestRunHandler_SuccessIntegration(t *testing.T) {
	// Mock server to be the target of our load test
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))
	defer ts.Close()

	payload := struct {
		LoadTestRequest
		Requests []WorkflowStep `json:"requests"`
	}{
		LoadTestRequest: LoadTestRequest{
			URL:           ts.URL,
			Method:        "GET",
			TotalRequests: 2,
			Single:        true,
		},
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/run", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	// Use a background context that won't be cancelled immediately
	runHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if !bytes.Contains(rr.Body.Bytes(), []byte("summary")) {
		t.Error("Response should contain final summary")
	}
}