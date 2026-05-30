package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type MockResponse struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	IsFile      bool              `json:"isFile"`
	FileName    string            `json:"fileName"`
	FileContent string            `json:"fileContent"` // Base64
}

type MockDefinition struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Path        string         `json:"path"`   // ex: /api/v1/users/:id
	Method      string         `json:"method"`
	Response    MockResponse   `json:"response"`
	Assertions  []Assertion    `json:"assertions"` // Validação da requisição recebida
	Active      bool           `json:"active"`
}

var (
	mocks   = make(map[string]MockDefinition)
	mocksMu sync.RWMutex

	mockListeners   = make(map[chan MockLogEntry]bool)
	mockListenersMu sync.Mutex
)

type MockLogEntry struct {
	MockID          string            `json:"mockId"`
	Timestamp       string            `json:"timestamp"`
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	RequestHeaders  map[string]string `json:"requestHeaders"`
	RequestBody     string            `json:"requestBody"`
	StatusCode      int               `json:"statusCode"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	ResponseBody    string            `json:"responseBody"`
}

func broadcastMockLog(log MockLogEntry) {
	mockListenersMu.Lock()
	defer mockListenersMu.Unlock()
	for ch := range mockListeners {
		select {
		case ch <- log:
		default:
		}
	}
}

func manageMocksHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	mocksMu.Lock()
	defer mocksMu.Unlock()

	switch r.Method {
	case http.MethodGet:
		list := make([]MockDefinition, 0, len(mocks))
		for _, v := range mocks {
			list = append(list, v)
		}
		json.NewEncoder(w).Encode(list)
	case http.MethodPost:
		var m MockDefinition
		if err := json.NewDecoder(r.Body).Decode(&m); err == nil {
			if m.ID == "" {
				m.ID = fmt.Sprintf("%d", time.Now().UnixNano())
			}
			mocks[m.ID] = m
			json.NewEncoder(w).Encode(m)
		}
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		delete(mocks, id)
		w.WriteHeader(http.StatusNoContent)
	}
}

func mockStreamHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	logChan := make(chan MockLogEntry, 10)
	mockListenersMu.Lock()
	mockListeners[logChan] = true
	mockListenersMu.Unlock()

	defer func() {
		mockListenersMu.Lock()
		delete(mockListeners, logChan)
		mockListenersMu.Unlock()
		close(logChan)
	}()

	for {
		select {
		case log := <-logChan:
			data, _ := json.Marshal(log)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func mockServerHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "*")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	path := strings.TrimPrefix(r.URL.Path, "/mock")
	if path == "" { path = "/" }

	mocksMu.RLock()
	var matchedMock *MockDefinition
	mockEnv := make(map[string]string)

	for _, m := range mocks {
		if !m.Active { continue }
		paramRegex := regexp.MustCompile(`:([a-zA-Z0-9]+)`)
		dynamicPath := paramRegex.ReplaceAllString(m.Path, `(?P<$1>[^/]+)`)
		pattern := regexp.MustCompile("^" + dynamicPath + "$")
		matches := pattern.FindStringSubmatch(path)
		if matches != nil && (m.Method == "ALL" || m.Method == r.Method) {
			temp := m
			matchedMock = &temp
			names := pattern.SubexpNames()
			for i, value := range matches {
				if i > 0 && i < len(names) { mockEnv[names[i]] = value }
			}
			break
		}
	}
	mocksMu.RUnlock()

	if matchedMock == nil {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, `{"error": "Mock not found for path: %s"}`, path)
		return
	}

	// Assertion validation for incoming request (Headers/Body)
	if len(matchedMock.Assertions) > 0 {
		bodyStr := string(bodyBytes)
		for _, a := range matchedMock.Assertions {
			var actual string
			found := true
			if a.Source == "header" {
				actual = r.Header.Get(a.Property)
				if _, ok := r.Header[http.CanonicalHeaderKey(a.Property)]; !ok {
					found = false
				}
			} else if a.Source == "body" {
				if a.Property != "" {
					val, err := getBodyValue(bodyStr, a.Property)
					if err != nil {
						found = false
					} else {
						actual = val
					}
				} else {
					actual = bodyStr
				}
			}
			pass := true
			if a.Operator == "exists" { pass = found } else if a.Operator == "not_exists" { pass = !found } else if !found { pass = false } else {
				switch a.Operator {
				case "==": pass = (actual == a.Target)
				case "!=": pass = (actual != a.Target)
				case "contains": pass = strings.Contains(actual, a.Target)
				}
			}
			if !pass {
				w.WriteHeader(http.StatusBadRequest)
				fmt.Fprintf(w, `{"error": "Assertion failed"}`)
				return
			}
		}
	}

	status := matchedMock.Response.Status
	if status == 0 { status = http.StatusOK }

	if matchedMock.Response.IsFile && matchedMock.Response.FileContent != "" {
		content, err := base64.StdEncoding.DecodeString(matchedMock.Response.FileContent)
		if err == nil {
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", matchedMock.Response.FileName))
			w.Header().Set("Content-Type", "application/octet-stream")
			for k, v := range matchedMock.Response.Headers {
				w.Header().Set(k, executeTemplate(parseTemplate(v), mockEnv))
			}
			w.WriteHeader(status)
			w.Write(content)
			return
		}
	}

	finalBody := executeTemplate(parseTemplate(matchedMock.Response.Body), mockEnv)
	for k, v := range matchedMock.Response.Headers {
		w.Header().Set(k, executeTemplate(parseTemplate(v), mockEnv))
	}
	w.WriteHeader(status)
	w.Write([]byte(finalBody))

	broadcastMockLog(MockLogEntry{
		MockID: matchedMock.ID, Timestamp: time.Now().Format("15:04:05"),
		Method: r.Method, URL: r.URL.String(),
		RequestHeaders: flattenHeaders(r.Header), RequestBody: string(bodyBytes),
		StatusCode: status, ResponseHeaders: matchedMock.Response.Headers,
		ResponseBody: finalBody,
	})
}