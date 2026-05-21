package main

import (
    "crypto/rand"
    "encoding/json"
    "fmt"
    "io"
    mrand "math/rand"
    "net/http"
    "regexp"
    "strconv"
    "strings"
    "sync"
    "sync/atomic"
    "time"
)

type LoadTestRequest struct {
    URL       string            `json:"url"`
    Method    string            `json:"method"`
    Threads   int               `json:"threads"`
    Duration  int               `json:"duration"`
    RampUp    int               `json:"rampUp"`
    Headers   map[string]string `json:"headers"`
    Body      string            `json:"body"`
    Single    bool              `json:"single"`
    Variables map[string]string `json:"variables"`
}

type LoadTestResult struct {
    TotalRequests int64 `json:"totalRequests"`
    SuccessCount  int64 `json:"successCount"`
    ErrorCount    int64 `json:"errorCount"`
}

type RequestLogEntry struct {
	URL            string            `json:"url"`
	Method         string            `json:"method"`
	StatusCode     int               `json:"statusCode"`
	Timestamp      string            `json:"timestamp"`
	ResponseTime   int64             `json:"responseTime"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	ResponseBody   string            `json:"responseBody"`
	RequestHeaders map[string]string `json:"requestHeaders"` // Adiciona headers da requisição
	RequestBody    string            `json:"requestBody"`    // Adiciona body da requisição
	RunningThreads int               `json:"runningThreads"`
}

// Template engine helpers
type TemplatePart struct {
	Static string
	Var    string
	Format string
}

func parseTemplate(text string) []TemplatePart {
	re := regexp.MustCompile(`\{\{\s*([^}:]+)(?::([^}]+))?\s*\}\}`)
	matches := re.FindAllStringSubmatchIndex(text, -1)
	var parts []TemplatePart
	lastPos := 0
	for _, match := range matches {
		if match[0] > lastPos {
			parts = append(parts, TemplatePart{Static: text[lastPos:match[0]]})
		}
		varName := text[match[2]:match[3]]
		format := ""
		if match[4] != -1 {
			format = text[match[4]:match[5]]
		}
		parts = append(parts, TemplatePart{Var: strings.TrimSpace(varName), Format: strings.TrimSpace(format)})
		lastPos = match[1]
	}
	if lastPos < len(text) {
		parts = append(parts, TemplatePart{Static: text[lastPos:]})
	}
	return parts
}

func translateLayout(format string) string {
	layout := strings.ReplaceAll(format, "YYYY", "2006")
	layout = strings.ReplaceAll(layout, "MM", "01")
	layout = strings.ReplaceAll(layout, "DD", "02")
	layout = strings.ReplaceAll(layout, "HH", "15")
	layout = strings.ReplaceAll(layout, "mm", "04")
	layout = strings.ReplaceAll(layout, "ss", "05")
	return layout
}

func executeTemplate(parts []TemplatePart, env map[string]string) string {
	var sb strings.Builder
	for _, p := range parts {
		if p.Var == "" {
			sb.WriteString(p.Static)
			continue
		}

		// Prioriza variáveis de ambiente definidas pelo usuário
		if val, ok := env[p.Var]; ok {
			sb.WriteString(val)
			continue
		}

		switch strings.ToLower(p.Var) {
		case "uuid":
			sb.WriteString(generateUUID())
		case "timestamp":
			sb.WriteString(fmt.Sprintf("%d", time.Now().Unix()))
		case "date", "time", "datetime":
			layout := "2006-01-02"
			if strings.ToLower(p.Var) == "time" {
				layout = "15:04:05"
			} else if strings.ToLower(p.Var) == "datetime" {
				layout = "2006-01-02 15:04:05"
			}
			if p.Format != "" {
				layout = translateLayout(p.Format)
			}
			sb.WriteString(time.Now().Format(layout))
		case "int", "integer":
			min, max := 0, 1000
			if p.Format != "" {
				parts := strings.Split(p.Format, ":")
				if len(parts) == 1 {
					if val, err := strconv.Atoi(parts[0]); err == nil {
						max = val
					}
				} else if len(parts) >= 2 {
					if v1, err := strconv.Atoi(parts[0]); err == nil {
						min = v1
					}
					if v2, err := strconv.Atoi(parts[1]); err == nil {
						max = v2
					}
				}
			}
			if max <= min {
				sb.WriteString(strconv.Itoa(min))
			} else {
				sb.WriteString(strconv.Itoa(mrand.Intn(max-min+1) + min))
			}
		case "float":
			min, max := 0.0, 1.0
			if p.Format != "" {
				parts := strings.Split(p.Format, ":")
				if len(parts) == 1 {
					if val, err := strconv.ParseFloat(parts[0], 64); err == nil {
						max = val
					}
				} else if len(parts) >= 2 {
					if v1, err := strconv.ParseFloat(parts[0], 64); err == nil {
						min = v1
					}
					if v2, err := strconv.ParseFloat(parts[1], 64); err == nil {
						max = v2
					}
				}
			}
			val := min + mrand.Float64()*(max-min)
			sb.WriteString(fmt.Sprintf("%.2f", val))
		case "string":
			length := 10
			if p.Format != "" {
				if val, err := strconv.Atoi(p.Format); err == nil {
					length = val
				}
			}
			sb.WriteString(randomString(length))
		case "name":
			sb.WriteString(randomName())
		case "tel", "telephone":
			format := "(##) #####-####"
			if p.Format != "" {
				format = p.Format
			}
			sb.WriteString(formatTelephone(format))
		default:
			sb.WriteString("{{" + p.Var + "}}")
		}
	}
	return sb.String()
}

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func randomString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = charset[mrand.Intn(len(charset))]
	}
	return string(b)
}

func randomName() string {
	names := []string{"Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Henry", "Isabella", "Jack", "Karl", "Luna", "Mike", "Nina", "Oscar", "Paul", "Quinn", "Rosa", "Sam", "Tina"}
	return names[mrand.Intn(len(names))]
}

func formatTelephone(format string) string {
	var result strings.Builder
	for _, char := range format {
		if char == '#' {
			result.WriteString(fmt.Sprintf("%d", mrand.Intn(10)))
		} else {
			result.WriteRune(char)
		}
	}
	return result.String()
}

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

var httpClient = &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        1000,
        MaxIdleConnsPerHost: 1000, // Aumentado para suportar mais threads
        IdleConnTimeout:     30 * time.Second,
    },
}

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

    var reqData LoadTestRequest
    if err := json.NewDecoder(r.Body).Decode(&reqData); err != nil {
        http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
        return
    }

    // Validação básica de URL
    if !strings.HasPrefix(reqData.URL, "http://") && !strings.HasPrefix(reqData.URL, "https://") {
        reqData.URL = "http://" + reqData.URL
    }

    startTime := time.Now()
    fmt.Printf("Iniciando teste: %s | Threads: %d | Duração: %ds\n", reqData.URL, reqData.Threads, reqData.Duration)

    var success, errors int64
    var activeThreads int64
    var wg sync.WaitGroup
    logChan := make(chan RequestLogEntry, 100)

	urlTemplate := parseTemplate(reqData.URL)
	bodyTemplate := parseTemplate(reqData.Body)
	headerTemplates := make(map[string][]TemplatePart)
	for k, v := range reqData.Headers {
		headerTemplates[k] = parseTemplate(v)
	}

    deadline := time.Now().Add(time.Duration(reqData.Duration) * time.Second)

	numThreads := reqData.Threads
	if reqData.Single {
		numThreads = 1
	}

	// Calcula o intervalo de subida entre as threads (ramp-up)
	var rampUpInterval time.Duration
	if reqData.RampUp > 0 && numThreads > 1 && !reqData.Single {
		rampUpInterval = time.Duration(float64(reqData.RampUp)/float64(numThreads)*float64(time.Second))
	}

	// Iniciamos a criação das threads em uma goroutine separada.
	// Isso permite que o loop de streaming de logs (abaixo) comece a rodar imediatamente.
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < numThreads; i++ {
			if i > 0 && rampUpInterval > 0 {
				time.Sleep(rampUpInterval)
			}

			// Interrompe a criação de novas threads se o tempo total do teste já expirou durante o ramp-up
			if time.Now().After(deadline) {
				break
			}

			wg.Add(1)
			atomic.AddInt64(&activeThreads, 1)
			go func() {
				defer wg.Done()
				defer atomic.AddInt64(&activeThreads, -1)
				for {
					currentURL := executeTemplate(urlTemplate, reqData.Variables)
					currentBody := executeTemplate(bodyTemplate, reqData.Variables)
					currentHeaders := make(map[string]string)

					req, err := http.NewRequest(reqData.Method, currentURL, strings.NewReader(currentBody))
					if err != nil {
						atomic.AddInt64(&errors, 1)
						continue
					}

					for k, tpl := range headerTemplates {
						val := executeTemplate(tpl, reqData.Variables)
						currentHeaders[k] = val
						req.Header.Set(k, val)
					}

					start := time.Now()

					resp, err := httpClient.Do(req)
					elapsed := time.Since(start).Milliseconds()

					responseHeaders := make(map[string]string)
					if resp != nil {
						for k, v := range resp.Header {
							responseHeaders[k] = strings.Join(v, ", ")
						}
					}

					responseBody := ""
					if resp != nil && resp.Body != nil {
						bodyBytes, _ := io.ReadAll(resp.Body)
						responseBody = string(bodyBytes)
						resp.Body.Close()
					}

					if err != nil {
						atomic.AddInt64(&errors, 1)
						logChan <- RequestLogEntry{URL: currentURL, Method: reqData.Method, StatusCode: 0, Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed, RequestHeaders: currentHeaders, RequestBody: currentBody, RunningThreads: int(atomic.LoadInt64(&activeThreads))}
						time.Sleep(10 * time.Millisecond) // Evita loop frenético em caso de erro
					} else {
						if resp.StatusCode >= 200 && resp.StatusCode < 300 {
							atomic.AddInt64(&success, 1)
						} else {
							atomic.AddInt64(&errors, 1)
						}
						logChan <- RequestLogEntry{URL: currentURL, Method: reqData.Method, StatusCode: resp.StatusCode, Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed, ResponseHeaders: responseHeaders, ResponseBody: responseBody, RequestHeaders: currentHeaders, RequestBody: currentBody, RunningThreads: int(atomic.LoadInt64(&activeThreads))}
					}

					// Se for Single Run ou o tempo acabou, encerra a goroutine
					if reqData.Single || time.Now().After(deadline) {
						break
					}
				}
			}()
		}
	}()

    // Goroutine para fechar o canal quando o WaitGroup terminar
    go func() {
        wg.Wait()
        close(logChan)
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

    fmt.Println("🚀 AST DevTools Backend rodando em http://localhost:8080")
    fmt.Println("👉 Rota de execução: POST http://localhost:8080/run")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Println(err)
    }
}