package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "os"
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

func getEnv(key, fallback string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return fallback
}

func main() {
    port := getEnv("PORT", "8080")
    tz := getEnv("TZ", "UTC")
    os.Setenv("TZ", tz)

    // Rota para teste de conectividade
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprintf(w, `{"status": "Backend is running", "endpoints": ["/run"], "timezone": "%s"}`, tz)
    })

    http.HandleFunc("/run", runHandler)
	http.HandleFunc("/manage-mocks", manageMocksHandler)
	http.HandleFunc("/mock/", mockServerHandler)
	http.HandleFunc("/mock-stream", mockStreamHandler)

    fmt.Printf("🚀 Unified API Workspace Backend rodando em http://localhost:%s\n", port)
    fmt.Printf("⏰ Timezone: %s\n", tz)
    fmt.Printf("👉 Rota de execução: POST http://localhost:%s/run\n", port)
    if err := http.ListenAndServe(":"+port, nil); err != nil {
        fmt.Println(err)
    }
}