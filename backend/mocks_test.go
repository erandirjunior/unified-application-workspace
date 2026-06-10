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
	"time"
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


func TestMockServerHandler_Options(t *testing.T) {
	req := httptest.NewRequest("OPTIONS", "/mock/any-path", nil)
	rr := httptest.NewRecorder()
	mockServerHandler(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Errorf("Expected 204 for OPTIONS, got %d", rr.Code)
	}
}

func TestMockServerHandler_Delay(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["delay-mock"] = MockDefinition{
		ID:     "delay-mock",
		Path:   "/delayed",
		Method: "GET",
		Active: true,
		Delay:  50, // 50ms delay
		Response: MockResponse{
			Status: 200,
			Body:   "delayed response",
		},
	}
	mocksMu.Unlock()

	req := httptest.NewRequest("GET", "/mock/delayed", nil)
	rr := httptest.NewRecorder()

	start := time.Now()
	mockServerHandler(rr, req)
	elapsed := time.Since(start)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
	if elapsed < 50*time.Millisecond {
		t.Errorf("Expected at least 50ms delay, got %v", elapsed)
	}
}

func TestMockServerHandler_InactiveNotMatched(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["inactive"] = MockDefinition{
		ID:     "inactive",
		Path:   "/active-only",
		Method: "GET",
		Active: false, // inactive
		Response: MockResponse{Status: 200, Body: "should not match"},
	}
	mocksMu.Unlock()

	req := httptest.NewRequest("GET", "/mock/active-only", nil)
	rr := httptest.NewRecorder()
	mockServerHandler(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for inactive mock, got %d", rr.Code)
	}
}

func TestMockServerHandler_MethodALL(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["all-method"] = MockDefinition{
		ID:     "all-method",
		Path:   "/any-method",
		Method: "ALL",
		Active: true,
		Response: MockResponse{Status: 200, Body: "matched"},
	}
	mocksMu.Unlock()

	for _, method := range []string{"GET", "POST", "PUT", "DELETE"} {
		req := httptest.NewRequest(method, "/mock/any-method", nil)
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200 for method %s with ALL matcher, got %d", method, rr.Code)
		}
	}
}

func TestMockServerHandler_DefaultStatus(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["no-status"] = MockDefinition{
		ID:     "no-status",
		Path:   "/no-status",
		Method: "GET",
		Active: true,
		Response: MockResponse{Status: 0, Body: "default status"},
	}
	mocksMu.Unlock()

	req := httptest.NewRequest("GET", "/mock/no-status", nil)
	rr := httptest.NewRecorder()
	mockServerHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 as default status, got %d", rr.Code)
	}
}

func TestMockServerHandler_AssertionExistsNotExists(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["assert-exists"] = MockDefinition{
		ID:     "assert-exists",
		Path:   "/check-header",
		Method: "GET",
		Active: true,
		Assertions: []Assertion{
			{Source: "header", Property: "X-Required", Operator: "exists"},
		},
		Response: MockResponse{Status: 200, Body: "ok"},
	}
	mocks["assert-not-exists"] = MockDefinition{
		ID:     "assert-not-exists",
		Path:   "/check-no-header",
		Method: "GET",
		Active: true,
		Assertions: []Assertion{
			{Source: "header", Property: "X-Forbidden", Operator: "not_exists"},
		},
		Response: MockResponse{Status: 200, Body: "ok"},
	}
	mocksMu.Unlock()

	t.Run("Exists passes", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/mock/check-header", nil)
		req.Header.Set("X-Required", "value")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("Exists fails", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/mock/check-header", nil)
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", rr.Code)
		}
	})

	t.Run("Not exists passes", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/mock/check-no-header", nil)
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("Not exists fails", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/mock/check-no-header", nil)
		req.Header.Set("X-Forbidden", "bad")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", rr.Code)
		}
	})
}

func TestMockServerHandler_AssertionContainsNotEqual(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["assert-contains"] = MockDefinition{
		ID:     "assert-contains",
		Path:   "/check-contains",
		Method: "POST",
		Active: true,
		Assertions: []Assertion{
			{Source: "body", Property: "", Operator: "contains", Target: "hello"},
		},
		Response: MockResponse{Status: 200, Body: "ok"},
	}
	mocks["assert-neq"] = MockDefinition{
		ID:     "assert-neq",
		Path:   "/check-neq",
		Method: "POST",
		Active: true,
		Assertions: []Assertion{
			{Source: "header", Property: "X-Mode", Operator: "!=", Target: "debug"},
		},
		Response: MockResponse{Status: 200, Body: "ok"},
	}
	mocksMu.Unlock()

	t.Run("Contains passes", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/check-contains", strings.NewReader("hello world"))
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("Contains fails", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/check-contains", strings.NewReader("goodbye"))
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", rr.Code)
		}
	})

	t.Run("NotEqual passes", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/check-neq", nil)
		req.Header.Set("X-Mode", "production")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("NotEqual fails", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/check-neq", nil)
		req.Header.Set("X-Mode", "debug")
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", rr.Code)
		}
	})
}

func TestMockStreamHandler_WithLog(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest("GET", "/mock-stream", nil)
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		mockStreamHandler(rr, req)
		close(done)
	}()

	// Give time for the handler to register the listener
	time.Sleep(50 * time.Millisecond)

	// Broadcast a log entry
	broadcastMockLog(MockLogEntry{MockID: "stream-test", Method: "POST", URL: "/test"})

	// Give time for the event to be written
	time.Sleep(50 * time.Millisecond)

	cancel()
	<-done

	body := rr.Body.String()
	if !strings.Contains(body, "stream-test") {
		t.Errorf("Expected streamed log to contain mock ID, got: %s", body)
	}
}

func TestManageMocksHandler_PostWithID(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocksMu.Unlock()

	mockData := MockDefinition{
		ID:     "custom-id",
		Name:   "Custom Mock",
		Path:   "/custom",
		Method: "POST",
		Active: true,
		Response: MockResponse{Status: 201, Body: "created"},
	}
	body, _ := json.Marshal(mockData)
	req := httptest.NewRequest("POST", "/manage-mocks", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	manageMocksHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	mocksMu.RLock()
	stored, ok := mocks["custom-id"]
	mocksMu.RUnlock()

	if !ok {
		t.Error("Mock with custom-id not stored")
	}
	if stored.Name != "Custom Mock" {
		t.Errorf("Expected name 'Custom Mock', got %s", stored.Name)
	}
}

func TestMockServerHandler_BodyAssertionWithProperty(t *testing.T) {
	mocksMu.Lock()
	mocks = make(map[string]MockDefinition)
	mocks["body-prop"] = MockDefinition{
		ID:     "body-prop",
		Path:   "/body-check",
		Method: "POST",
		Active: true,
		Assertions: []Assertion{
			{Source: "body", Property: "action", Operator: "==", Target: "create"},
		},
		Response: MockResponse{Status: 200, Body: "ok"},
	}
	mocksMu.Unlock()

	t.Run("Body property assertion passes", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/body-check", strings.NewReader(`{"action":"create"}`))
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
	})

	t.Run("Body property assertion fails", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/body-check", strings.NewReader(`{"action":"delete"}`))
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", rr.Code)
		}
	})

	t.Run("Body property assertion invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/mock/body-check", strings.NewReader(`not json`))
		rr := httptest.NewRecorder()
		mockServerHandler(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 for invalid json, got %d", rr.Code)
		}
	})
}
