package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"strings"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestManageMocksHandler(t *testing.T) {
	// Clear mocks for testing
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocksMu.Unlock()

	t.Run("Create Mock", func(t *testing.T) {
		mockData := MockDefinition{
			Name:   "Test Mock",
			Path:   "/test",
			Method: "GET",
			Active: true,
			Response: MockResponse{
				Status: 200,
				Body:   "hello",
			},
		}
		body, _ := json.Marshal(mockData)
		req := httptest.NewRequest("POST", "/manage-mocks", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()

		manageMocksHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
	})

	t.Run("List Mocks", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/manage-mocks", nil)
		rr := httptest.NewRecorder()
		manageMocksHandler(rr, req)

		var list []MockDefinition
		json.Unmarshal(rr.Body.Bytes(), &list)
		if len(list) == 0 {
			t.Error("Expected at least one mock in list")
		}
	})

	t.Run("Options Method", func(t *testing.T) {
		req := httptest.NewRequest("OPTIONS", "/manage-mocks", nil)
		rr := httptest.NewRecorder()
		manageMocksHandler(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Errorf("Expected 204 for OPTIONS, got %d", rr.Code)
		}
	})

	t.Run("Delete Mock", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/manage-mocks?id=1", nil)
		rr := httptest.NewRecorder()
		manageMocksHandler(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Errorf("Expected 204, got %d", rr.Code)
		}
	})
}

func TestBroadcastMockLog(t *testing.T) {
	ch := make(chan MockLogEntry, 1)
	mockListenersMu.Lock()
	mockListeners[ch] = true
	mockListenersMu.Unlock()
	defer func() {
		mockListenersMu.Lock()
		delete(mockListeners, ch)
		mockListenersMu.Unlock()
	}()

	log := MockLogEntry{MockID: "test-id", Method: "GET"}
	broadcastMockLog(log)

	select {
	case received := <-ch:
		if received.MockID != "test-id" { t.Errorf("Expected test-id, got %s", received.MockID) }
	default:
		t.Error("Log was not broadcasted")
	}
}

func TestMockServerHandler(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["1"] = MockDefinition{
		ID:     "1",
		Path:   "/users/:id",
		Method: "GET",
		Active: true,
		Response: MockResponse{
			Status: 200,
			Body:   "User ID: {{id}}",
		},
	}
	mocksMu.Unlock()

	t.Run("Dynamic Path Matching", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/mock/users/42", nil)
		rr := httptest.NewRecorder()

		mockServerHandler(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", rr.Code)
		}
		expectedBody := "User ID: 42"
		if rr.Body.String() != expectedBody {
			t.Errorf("Expected body %s, got %s", expectedBody, rr.Body.String())
		}
	})

	t.Run("File Response", func(t *testing.T) {
		content := base64.StdEncoding.EncodeToString([]byte("file-content"))
		mocksMu.Lock()
		mocks["file-mock"] = MockDefinition{
			ID:     "file-mock",
			Path:   "/download",
			Method: "GET",
			Active: true,
			Response: MockResponse{
				IsFile:      true,
				FileName:    "test.txt",
				FileContent: content,
			},
		}
		mocksMu.Unlock()

		req := httptest.NewRequest("GET", "/mock/download", nil)
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)

		if rr.Header().Get("Content-Disposition") == "" {
			t.Error("Expected Content-Disposition header for file response")
		}
		if rr.Body.String() != "file-content" {
			t.Errorf("Expected file-content, got %s", rr.Body.String())
		}
	})
}

func TestMockStreamHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/mock-stream", nil)
	// Create a cancellable context to stop the streaming handler
	ctx, cancel := context.WithCancel(context.Background())
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	// Start a goroutine to cancel the request after a short time
	go func() {
		cancel()
	}()

	mockStreamHandler(rr, req)

	if rr.Header().Get("Content-Type") != "text/event-stream" {
		t.Errorf("Expected text/event-stream, got %s", rr.Header().Get("Content-Type"))
	}
}

func TestMockServerHandler_NotFound(t *testing.T) {
	// Clean mocks to ensure 404
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocksMu.Unlock()

	req := httptest.NewRequest("GET", "/mock/non-existent-path", nil)
	rr := httptest.NewRecorder()
	mockServerHandler(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}
}

func TestMockServerHandler_Assertions(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["auth-mock"] = MockDefinition{
		ID:     "auth-mock",
		Path:   "/secure",
		Method: "POST",
		Active: true,
		Assertions: []Assertion{
			{Source: "header", Property: "Authorization", Operator: "==", Target: "SecretToken"},
			{Source: "body", Property: "token", Operator: "==", Target: "123"},
		},
		Response: MockResponse{Status: 200, Body: "Access Granted"},
	}
	mocksMu.Unlock()

	t.Run("Assertion Success", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/secure", strings.NewReader(`{"token":"123"}`))
		req.Header.Set("Authorization", "SecretToken")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("Assertion Failure", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/secure", strings.NewReader(`{"token":"wrong"}`))
		req.Header.Set("Authorization", "SecretToken")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for failed assertion, got %d", rr.Code)
		}
	})
}

func TestMockServerHandler_TemplateHeaders(t *testing.T) {
	mocksMu.Lock()
	mocks["header-tpl"] = MockDefinition{
		ID: "header-tpl", Path: "/tpl", Method: "GET", Active: true,
		Response: MockResponse{
			Status: 200,
			Headers: map[string]string{"X-Req-ID": "{{uuid}}"},
			Body: "ok",
		},
	}
	mocksMu.Unlock()
	
	req := httptest.NewRequest("GET", "/mock/tpl", nil)
	rr := httptest.NewRecorder()
	mockServerHandler(rr, req)
	
	if len(rr.Header().Get("X-Req-ID")) != 36 {
		t.Errorf("Expected UUID in header, got %s", rr.Header().Get("X-Req-ID"))
	}
}