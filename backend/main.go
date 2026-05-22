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

type Assertion struct {
	Source   string `json:"source"`   // "status", "body", "header"
	Property string `json:"property"` // nome do header
	Operator string `json:"operator"` // "==", "contains"
	Target   string `json:"target"`   // valor esperado
}

type Extraction struct {
	Source   string `json:"source"`   // "body", "header"
	Property string `json:"property"` // nome do header ou futuramente json path
	VarName  string `json:"varName"`
}

type LoadTestRequest struct {
	URL         string            `json:"url"`
	Method      string            `json:"method"`
	Threads     int               `json:"threads"`
	Duration    int               `json:"duration"`
	RampUp      int               `json:"rampUp"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	Single      bool              `json:"single"`
	Variables   map[string]string `json:"variables"`
	Assertions  []Assertion       `json:"assertions"`
	Extractions []Extraction      `json:"extractions"`
	Name        string            `json:"name"`
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
	RequestHeaders map[string]string `json:"requestHeaders"`
	RequestBody    string            `json:"requestBody"`
	RunningThreads int               `json:"runningThreads"`
	Success        bool              `json:"success"` // Resultado da validação
	ErrorMessage   string            `json:"errorMessage"`
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

// getJsonValue extracts a value from a JSON string using a simplified JSONPath (dot notation and array indexing).
// Example paths: "name", "address.city", "items[0].id", "$.items[0]"
func getJsonValue(jsonString string, path string) (string, error) {
	var data interface{}
	err := json.Unmarshal([]byte(jsonString), &data)
	if err != nil {
		return "", fmt.Errorf("falha ao parsear JSON: %w", err)
	}

	// Normaliza o path: remove prefixos comuns de JSONPath para busca direta
	path = strings.TrimPrefix(path, "$.")
	path = strings.TrimPrefix(path, "$")
	path = strings.TrimPrefix(path, ".")

	if path == "" {
		// Return the whole JSON as a string if the path is empty (root)
		if dataBytes, err := json.Marshal(data); err == nil {
			return string(dataBytes), nil
		}
		return fmt.Sprintf("%v", data), nil // Fallback
	}

	current := data
	// Split path by '.' but handle array indices within parts
	segments := strings.Split(path, ".")

	for _, segment := range segments {
		// Handle array index like "items[0]" or just "[0]"
		reArrayIndex := regexp.MustCompile(`^([a-zA-Z0-9_]*)\[(\d+)\]$`)
		arrayMatch := reArrayIndex.FindStringSubmatch(segment)

		if arrayMatch != nil {
			key := arrayMatch[1]
			indexStr := arrayMatch[2]

			if key != "" {
				if currentMap, ok := current.(map[string]interface{}); ok {
					if val, found := currentMap[key]; found {
						current = val
					} else {
						return "", fmt.Errorf("campo '%s' não encontrado", key)
					}
				} else {
					return "", fmt.Errorf("não é possível acessar chave '%s' em um não-objeto", key)
				}
			}

			if currentArray, ok := current.([]interface{}); ok {
				index, _ := strconv.Atoi(indexStr)
				if index >= 0 && index < len(currentArray) {
					current = currentArray[index]
				} else {
					return "", fmt.Errorf("índice %d fora dos limites", index)
				}
			} else {
				return "", fmt.Errorf("segmento '%s' indica array, mas o dado não é uma lista", segment)
			}
		} else {
			if currentMap, ok := current.(map[string]interface{}); ok {
				if val, found := currentMap[segment]; found {
					current = val
				} else {
					return "", fmt.Errorf("campo '%s' não encontrado", segment)
				}
			} else {
				return "", fmt.Errorf("caminho inválido: tentando acessar '%s' em um valor que não é objeto", segment)
			}
		}
	}

	if current == nil {
		return "null", nil
	}
	if strVal, ok := current.(string); ok {
		return strVal, nil
	}
	if dataBytes, err := json.Marshal(current); err == nil {
		return string(dataBytes), nil
	}
	return fmt.Sprintf("%v", current), nil
}

func validateResponse(resp *http.Response, body string, assertions []Assertion) (bool, string) {
	if len(assertions) == 0 {
		return resp.StatusCode >= 200 && resp.StatusCode < 300, ""
	}

	for _, a := range assertions {
		var actual string
		switch a.Source {
		case "status":
			actual = strconv.Itoa(resp.StatusCode)
		case "body":
			if a.Property != "" { // If a JSONPath is provided
				val, err := getJsonValue(body, a.Property)
				if err != nil {
					return false, fmt.Sprintf("Erro ao extrair valor do body com JSONPath '%s': %v", a.Property, err)
				}
				actual = val
			} else { // Compare entire body
			actual = body
			}
		case "header":
			actual = resp.Header.Get(a.Property)
		}

		switch a.Operator {
		case "==":
			if actual != a.Target {
				return false, fmt.Sprintf("Esperado %s %s ser %s, mas recebeu %s", a.Source, a.Property, a.Target, actual)
			}
		case "contains":
			if !strings.Contains(actual, a.Target) {
				return false, fmt.Sprintf("%s %s não contém %s", a.Source, a.Property, a.Target)
			}
		}
	}
	return true, ""
}

func extractVars(resp *http.Response, body string, extractions []Extraction, vars map[string]string) {
	for _, e := range extractions {
		val := ""
		switch e.Source {
		case "header":
			val = resp.Header.Get(e.Property) // Property is header name
		case "body":
			if e.Property != "" { // Property is JSONPath
				extractedVal, err := getJsonValue(body, e.Property)
				if err == nil {
					val = extractedVal
				}
			} else {
				val = body // Implementação básica: extrai o body todo
			}
		}
		if e.VarName != "" {
			vars[e.VarName] = val
		}
	}
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

	var payload struct {
		LoadTestRequest
		Requests []LoadTestRequest `json:"requests"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Se vier uma lista, usamos ela, caso contrário tratamos como teste único
	requests := payload.Requests
	if len(requests) == 0 {
		requests = []LoadTestRequest{payload.LoadTestRequest}
	}

	startTime := time.Now()
	var success, errors int64
	var activeThreads int64
	logChan := make(chan RequestLogEntry, 100)

	// Variáveis compartilhadas entre todas as fases do cenário
	sharedVars := make(map[string]string)
	for k, v := range payload.Variables {
		sharedVars[k] = v
	}
	var varsMu sync.RWMutex

	// Goroutine principal para orquestrar as fases
	go func() {
		defer close(logChan)

		for _, rd := range requests {
			numThreads := rd.Threads
			if rd.Single { numThreads = 1 }
			
			deadline := time.Now().Add(time.Duration(rd.Duration) * time.Second)
			var phaseWg sync.WaitGroup

			rampUpInterval := time.Duration(0)
			if rd.RampUp > 0 && numThreads > 1 && !rd.Single {
				rampUpInterval = time.Duration(float64(rd.RampUp) / float64(numThreads) * float64(time.Second))
			}

			for i := 0; i < numThreads; i++ {
				if i > 0 && rampUpInterval > 0 { time.Sleep(rampUpInterval) }
				if time.Now().After(deadline) { break }

				phaseWg.Add(1)
				atomic.AddInt64(&activeThreads, 1)

				go func(currentRd LoadTestRequest) {
					defer phaseWg.Done()
					defer atomic.AddInt64(&activeThreads, -1)

					for {
						if time.Now().After(deadline) { break }

						varsMu.RLock()
						uT, bT := parseTemplate(currentRd.URL), parseTemplate(currentRd.Body)
						currentURL := executeTemplate(uT, sharedVars)
						currentBody := executeTemplate(bT, sharedVars)
						if !strings.HasPrefix(currentURL, "http") { currentURL = "http://" + currentURL }
						
						req, _ := http.NewRequest(currentRd.Method, currentURL, strings.NewReader(currentBody))
						for k, v := range currentRd.Headers {
							req.Header.Set(k, executeTemplate(parseTemplate(v), sharedVars))
						}
						varsMu.RUnlock()

						start := time.Now()
						resp, err := httpClient.Do(req)
						elapsed := time.Since(start).Milliseconds()

						if err == nil {
							b, _ := io.ReadAll(resp.Body)
							respBody := string(b)
							resp.Body.Close()

							valid, errMsg := validateResponse(resp, respBody, currentRd.Assertions)
							if valid { atomic.AddInt64(&success, 1) } else { atomic.AddInt64(&errors, 1) }

							varsMu.Lock()
							extractVars(resp, respBody, currentRd.Extractions, sharedVars)
							varsMu.Unlock()

							logChan <- RequestLogEntry{
								URL: currentURL, Method: currentRd.Method, StatusCode: resp.StatusCode,
								Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed,
								ResponseBody: respBody, Success: valid, ErrorMessage: errMsg,
								RunningThreads: int(atomic.LoadInt64(&activeThreads)),
							}
						} else {
							atomic.AddInt64(&errors, 1)
							logChan <- RequestLogEntry{URL: currentURL, Method: currentRd.Method, StatusCode: 0, Success: false, ErrorMessage: err.Error()}
						}
						if currentRd.Single { break }
					}
				}(rd)
			}
			phaseWg.Wait() // Aguarda a fase atual terminar antes de ir para o próximo passo
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

    fmt.Println("🚀 AST DevTools Backend rodando em http://localhost:8080")
    fmt.Println("👉 Rota de execução: POST http://localhost:8080/run")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Println(err)
    }
}