package main

import (
    "encoding/json"
    "fmt"
    "math"
    "net/http"
    "strconv"
    "strings"
    "sync"
    "sync/atomic"
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

	// Se vier uma lista, usamos ela, caso contrário tratamos como teste único
	requests := payload.Requests
	if len(requests) == 0 {
		requests = []WorkflowStep{{Type: "request", LoadTestRequest: payload.LoadTestRequest}}
	}

	startTime := time.Now()
	var success, errors int64
	var activeThreads int64
	logChan := make(chan RequestLogEntry, 100)
	var allWorkersWg sync.WaitGroup

	// Variáveis compartilhadas entre todas as fases do cenário
	sharedVars := make(map[string]string)
	for k, v := range payload.Variables {
		sharedVars[k] = v
	}
	var varsMu sync.RWMutex

	// Goroutine principal para orquestrar as fases
	go func() {
		ctx := r.Context()
		defer func() {
			allWorkersWg.Wait() // Espera ABSOLUTAMENTE todos os workers antes de fechar
			close(logChan)
		}()

		mainLoop:
		for _, step := range requests {
			select {
			case <-ctx.Done():
				break mainLoop
			default:
			}

			// Lógica para execução paralela dentro de um Workflow
			if step.Type == "parallel" {
				var stepWg sync.WaitGroup
				for _, rd := range step.Requests {
					stepWg.Add(1)
					allWorkersWg.Add(1)
					atomic.AddInt64(&activeThreads, 1)
					go func(currentRd LoadTestRequest) {
						defer stepWg.Done()
						defer allWorkersWg.Done()
						defer atomic.AddInt64(&activeThreads, -1)
						executeSingleRequest(ctx, currentRd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)
					}(rd)
				}
				stepWg.Wait()
				continue
			}

			// Lógica original (Sequencial)
			rd := step.LoadTestRequest
			
			// Se for um passo de Workflow (sem duração ou marcado como single), forçamos 1 execução
			isWorkflowStep := step.Type == "request" && rd.Duration <= 0

			// Fallback de tipo
			if step.Type == "" && rd.URL != "" {
				step.Type = "request"
			}

			// Suporte a passo de "Espera" (Think Time)
			if strings.ToLower(rd.Method) == "wait" || step.Type == "wait" {
				waitSec, _ := strconv.Atoi(rd.URL)
				time.Sleep(time.Duration(waitSec) * time.Second)
				continue
			}

			if rd.URL != "" {
				targetRPS := rd.TotalRequests
				if rd.Single || isWorkflowStep { targetRPS = 1 }

				totalToFire := 0
				if rd.Duration > 0 && !rd.Single {
					if rd.RampUp > 0 && rd.RampUp < rd.Duration {
						rampReqs := (targetRPS * rd.RampUp) / 2
						stableReqs := targetRPS * (rd.Duration - rd.RampUp)
						totalToFire = rampReqs + stableReqs
					} else {
						totalToFire = targetRPS * rd.Duration
					}
				} else {
					totalToFire = targetRPS
				}
				
				var phaseWg sync.WaitGroup
				firingInterval := time.Duration(0)
				if targetRPS > 0 {
					firingInterval = time.Second / time.Duration(targetRPS)
				}

				startTimePhase := time.Now()
				rampUpDuration := time.Duration(rd.RampUp) * time.Second
				numRampRequests := (targetRPS * rd.RampUp) / 2

				for i := 0; i < totalToFire; i++ {
					select {
					case <-ctx.Done(): break mainLoop
					default:
					}

					var targetTime time.Time
					if rd.RampUp > 0 && i < numRampRequests {
						t := math.Sqrt(2.0 * float64(rd.RampUp) * float64(i) / float64(targetRPS))
						targetTime = startTimePhase.Add(time.Duration(t * float64(time.Second)))
					} else if rd.RampUp > 0 && !rd.Single {
						offsetStable := float64(i-numRampRequests) / float64(targetRPS)
						targetTime = startTimePhase.Add(rampUpDuration).Add(time.Duration(offsetStable * float64(time.Second)))
					} else if firingInterval > 0 {
						targetTime = startTimePhase.Add(time.Duration(i) * firingInterval)
					}

					if !targetTime.IsZero() {
						time.Sleep(time.Until(targetTime))
					}

					phaseWg.Add(1)
					allWorkersWg.Add(1)
					atomic.AddInt64(&activeThreads, 1)

					go func(currentRd LoadTestRequest) {
						defer phaseWg.Done()
						defer allWorkersWg.Done()
						defer atomic.AddInt64(&activeThreads, -1)
						executeSingleRequest(ctx, currentRd, sharedVars, &varsMu, logChan, &success, &errors, &activeThreads)
					}(rd)
				}
				phaseWg.Wait() 
			}
		}
	}()

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