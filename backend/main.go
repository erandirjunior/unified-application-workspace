package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

func runHandler(w http.ResponseWriter, r *http.Request) {
    // Configuração robusta de CORS
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    w.Header().Set("Content-Type", "application/x-ndjson")
    w.Header().Set("Transfer-Encoding", "chunked")

    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusNoContent)
        return
    }

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }

	var payload struct {
		LoadTestRequest
		Requests []WorkflowStep `json:"requests"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	startTime := time.Now()
	var success, errors int64
	var activeThreads int64
	logChan := make(chan RequestLogEntry, 100)

	// Orquestra a execução do teste em uma goroutine separada
	go orchestrateLoadTest(
		r.Context(),
		payload.LoadTestRequest,
		payload.Requests,
		payload.Variables,
		logChan,
		&success,
		&errors,
		&activeThreads,
	)

    // Loop principal de escrita da resposta (Streaming)
    for entry := range logChan {
        data, _ := json.Marshal(entry)
        fmt.Fprintf(w, "%s\n", data)
        flusher.Flush()
    }

    // Envia o resultado final como última linha
    finalResult, _ := json.Marshal(struct {
        Type string `json:"type"`
        LoadTestResult
        TotalDuration float64 `json:"totalDuration"`
    }{
        Type: "summary",
        LoadTestResult: LoadTestResult{
        TotalRequests: success + errors,
        SuccessCount:  success,
        ErrorCount:    errors,
        },
        TotalDuration: time.Since(startTime).Seconds(),
    })
    fmt.Fprintf(w, "%s\n", finalResult)
    flusher.Flush()
}

func main() {
    // Rota para teste de conectividade
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprintf(w, `{"status": "Backend is running", "endpoints": ["/run"]}`)
    })

    http.HandleFunc("/run", runHandler)
	http.HandleFunc("/manage-mocks", manageMocksHandler)
	http.HandleFunc("/mock/", mockServerHandler)
	http.HandleFunc("/mock-stream", mockStreamHandler)

    fmt.Println("🚀 AST DevTools Backend rodando em http://localhost:8080")
    fmt.Println("👉 Rota de execução: POST http://localhost:8080/run")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Println(err)
    }
}