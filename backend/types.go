package main

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

type ResponseBodyField struct {
	Key            string `json:"key"`
	Type           string `json:"type"` // e.g., "string", "int", "object", "array"
	DocRequired    bool   `json:"docRequired"`
	DocExample     string `json:"docExample"`
	DocDescription string `json:"docDescription"`
}

type ResponseDoc struct {
	StatusCode  string              `json:"statusCode"`
	Description string              `json:"description"`
	Body        string              `json:"body"`
	BodyFields  []ResponseBodyField `json:"bodyFields"`
}

type LoadTestRequest struct {
	URL           string            `json:"url"`
	Method        string            `json:"method"`
	TotalRequests int               `json:"totalRequests"`
	Duration      int               `json:"duration"`
	RampUp        int               `json:"rampUp"`
	Headers       map[string]string `json:"headers"`
	Body          string            `json:"body"`
	Single        bool              `json:"single"`
	Variables     map[string]string `json:"variables"`
	Assertions    []Assertion       `json:"assertions"`
	Extractions   []Extraction      `json:"extractions"`
	Name          string            `json:"name"`
	Responses     []ResponseDoc     `json:"responses"`
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
	URL             string            `json:"url"`
	Method          string            `json:"method"`
	StatusCode      int               `json:"statusCode"`
	Timestamp       string            `json:"timestamp"`
	ResponseTime    int64             `json:"responseTime"`
	ResponseHeaders map[string]string `json:"responseHeaders"`
	ResponseBody    string            `json:"body"`
	RequestHeaders  map[string]string `json:"requestHeaders"`
	RequestBody     string            `json:"requestBody"`
	RunningThreads  int               `json:"runningThreads"`
	Success         bool              `json:"success"`
	ErrorMessage    string            `json:"errorMessage"`
}