package main

import "sync"

type MockResponse struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	IsFile      bool              `json:"isFile"`
	FileName    string            `json:"fileName"`
	FileContent string            `json:"fileContent"` // Base64
}

type MockDefinition struct {
	ID         string       `json:"id"`
	Name       string       `json:"name"`
	Path       string       `json:"path"`   // ex: /api/v1/users/:id
	Method     string       `json:"method"`
	Response   MockResponse `json:"response"`
	Assertions []Assertion  `json:"assertions"` // Validação da requisição recebida
	Active     bool         `json:"active"`
	Delay      int          `json:"delay"` // Delay em milissegundos antes de responder
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
