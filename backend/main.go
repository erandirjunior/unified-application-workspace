package main

import (
    "crypto/rand"
    "encoding/json"
    "fmt"
    "context"
    "io"
    "math"
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
	TotalRequests int               `json:"totalRequests"`
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

type WorkflowStep struct {
	Type     string            `json:"type"`     // "request", "parallel", "wait"
	Requests []LoadTestRequest `json:"requests"` // Usado para 'parallel'
	LoadTestRequest                    // Usado para 'request' e metadados
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

func getJsonValue(jsonString string, path string) (string, error) {
	var data interface{}
	if err := json.Unmarshal([]byte(jsonString), &data); err != nil {
		return "", fmt.Errorf("falha ao parsear JSON: %w", err)
	}

	path = strings.TrimPrefix(path, "$.")
	path = strings.TrimPrefix(path, "$")
	path = strings.TrimPrefix(path, ".")

	if path == "" {
		res, _ := json.Marshal(data)
		return string(res), nil
	}

	current := data
	segments := strings.Split(path, ".")
	reArrayIndex := regexp.MustCompile(`^([a-zA-Z0-9_]*)\[(\d+)\]$`)

	for _, segment := range segments {
		arrayMatch := reArrayIndex.FindStringSubmatch(segment)
		if arrayMatch != nil {
			key, indexStr := arrayMatch[1], arrayMatch[2]
			if key != "" {
				if m, ok := current.(map[string]interface{}); ok {
					current = m[key]
				}
			}
			if arr, ok := current.([]interface{}); ok {
				idx, _ := strconv.Atoi(indexStr)
				if idx >= 0 && idx < len(arr) {
					current = arr[idx]
				} else { return "", fmt.Errorf("index out of bounds") }
			}
		} else if m, ok := current.(map[string]interface{}); ok {
			current = m[segment]
		} else { return "", fmt.Errorf("campo não encontrado") }
	}

	if current == nil { return "null", nil }
	if s, ok := current.(string); ok { return s, nil }
	res, _ := json.Marshal(current)
	return string(res), nil
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

func executeSingleRequest(ctx context.Context, currentRd LoadTestRequest, sharedVars map[string]string, varsMu *sync.RWMutex, logChan chan RequestLogEntry, success *int64, errors *int64, activeThreads *int64) {
	varsMu.RLock()
	uT, bT := parseTemplate(currentRd.URL), parseTemplate(currentRd.Body)
	currentURL := executeTemplate(uT, sharedVars)
	currentBody := executeTemplate(bT, sharedVars)
	if !strings.HasPrefix(currentURL, "http") { currentURL = "http://" + currentURL }
	
	req, err := http.NewRequest(currentRd.Method, currentURL, strings.NewReader(currentBody))
	if err != nil {
		atomic.AddInt64(errors, 1)
		
		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: 0, 
			Success: false, ErrorMessage: fmt.Sprintf("Erro ao criar request: %v", err),
		}:
		}
		varsMu.RUnlock()
		return
	}

	// Captura os headers da requisição para o log
	sentHeaders := make(map[string]string)
	for k, v := range currentRd.Headers {
		val := executeTemplate(parseTemplate(v), sharedVars)
		req.Header.Set(k, val)
		sentHeaders[k] = val
	}
	varsMu.RUnlock()

	start := time.Now()
	resp, err := httpClient.Do(req)
	elapsed := time.Since(start).Milliseconds()

	if err == nil && resp != nil {
		b, _ := io.ReadAll(resp.Body)
		respBody := string(b)
		resp.Body.Close()

		// Captura os headers da resposta para o log
		respHeaders := make(map[string]string)
		for k, v := range resp.Header {
			respHeaders[k] = strings.Join(v, ", ")
		}

		valid, errMsg := validateResponse(resp, respBody, currentRd.Assertions)
		if valid { atomic.AddInt64(success, 1) } else { atomic.AddInt64(errors, 1) }

		varsMu.Lock()
		extractVars(resp, respBody, currentRd.Extractions, sharedVars)
		varsMu.Unlock()

		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: resp.StatusCode,
			Timestamp: time.Now().Format("15:04:05"), ResponseTime: elapsed,
			ResponseBody: respBody, ResponseHeaders: respHeaders,
			RequestBody: currentBody, RequestHeaders: sentHeaders,
			Success: valid, ErrorMessage: errMsg,
			RunningThreads: int(atomic.LoadInt64(activeThreads)),
		}:
		}
	} else {
		atomic.AddInt64(errors, 1)
		errMsg := "Erro desconhecido"
		if err != nil { errMsg = err.Error() }
		
		select {
		case <-ctx.Done():
		case logChan <- RequestLogEntry{
			URL: currentURL, Method: currentRd.Method, StatusCode: 0, 
			RequestBody: currentBody, RequestHeaders: sentHeaders,
			Success: false, ErrorMessage: errMsg,
			RunningThreads: int(atomic.LoadInt64(activeThreads)),
		}:
		}
	}
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