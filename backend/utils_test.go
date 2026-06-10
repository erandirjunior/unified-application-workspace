package main

import (
	"net/http"
	"testing"
)

func TestParseTemplate(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{"Simple text", "hello world", 1},
		{"Single variable", "{{name}}", 1},
		{"Mixed", "Hello {{name}}, welcome!", 3},
		{"Variable with format", "{{date:YYYY-MM-DD}}", 1},
		{"Multiple variables", "{{uuid}} - {{timestamp}}", 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parts := parseTemplate(tt.input)
			if len(parts) != tt.expected {
				t.Errorf("parseTemplate() returned %v parts, expected %v", len(parts), tt.expected)
			}
		})
	}
}

func TestExecuteTemplate(t *testing.T) {
	env := map[string]string{"name": "Erandir", "id": "123"}

	t.Run("Environment Variable", func(t *testing.T) {
		parts := parseTemplate("Hello {{name}}")
		result := executeTemplate(parts, env)
		if result != "Hello Erandir" {
			t.Errorf("executeTemplate() = %v, expected Hello Erandir", result)
		}
	})

	t.Run("Built-in UUID", func(t *testing.T) {
		parts := parseTemplate("{{uuid}}")
		result := executeTemplate(parts, env)
		if len(result) != 36 {
			t.Errorf("Invalid UUID: %v", result)
		}
	})

	t.Run("Template Built-ins", func(t *testing.T) {
		testCases := []string{
			"{{int:50}}",          // max only
			"{{int:10:20}}",      // min:max
			"{{float:1.5:2.5}}",  // min:max
			"{{string:12}}",      // length
			"{{name}}",
			"{{tel:(##) ####-####}}",
			"{{timestamp}}",
			"{{date:YYYY-MM}}",
			"{{datetime}}",
			"{{time}}",
			"{{unknown_var}}",
		}
		for _, tc := range testCases {
			parts := parseTemplate(tc)
			result := executeTemplate(parts, env)
			if result == "" {
				t.Errorf("Template %s failed to execute, got: %s", tc, result)
			}
			if tc == "{{string:12}}" && len(result) != 12 {
				t.Errorf("Expected string length 12, got %d", len(result))
			}
		}
	})

	t.Run("Execute Template Numeric Args", func(t *testing.T) {
		testCases := []string{"{{float:5.0}}", "{{int:500}}"}
		for _, tc := range testCases {
			parts := parseTemplate(tc)
			result := executeTemplate(parts, env)
			if result == "" {
				t.Errorf("Template %s failed", tc)
			}
		}
	})
}

func TestTranslateLayout(t *testing.T) {
	input := "YYYY-MM-DD HH:mm:ss"
	expected := "2006-01-02 15:04:05"
	got := translateLayout(input)
	if got != expected {
		t.Errorf("translateLayout() = %v, want %v", got, expected)
	}
}

func TestGenerateUUID(t *testing.T) {
	uuid := generateUUID()
	if len(uuid) != 36 {
		t.Errorf("generateUUID() produced invalid length: %v", len(uuid))
	}
}

func TestFlattenHeaders(t *testing.T) {
	h := http.Header{}
	h.Add("X-Test", "val1")
	h.Add("X-Test", "val2")
	
	m := flattenHeaders(h)
	if m["X-Test"] != "val1, val2" {
		t.Errorf("flattenHeaders() = %v, want val1, val2", m["X-Test"])
	}
}

func TestGetJsonValue_Advanced(t *testing.T) {
	jsonBody := `{"arr": [1, 2], "obj": {"a": 1}, "deep": {"nested": {"val": "ok"}}}`
	
	t.Run("Array Paths", func(t *testing.T) {
		_, err := getJsonValue(jsonBody, "arr[5]")
		if err == nil { t.Error("Expected error for out of bounds index") }

		val, _ := getJsonValue(jsonBody, "arr[1]")
		if val != "2" { t.Errorf("Expected 2, got %s", val) }
	})

	t.Run("Not An Array Error", func(t *testing.T) {
		_, err := getJsonValue(jsonBody, "obj[0]")
		if err == nil {
			t.Error("Expected error when accessing object as array")
		}
	})

	t.Run("Invalid XML", func(t *testing.T) {
		_, err := getXmlValue("invalid xml", "tag")
		if err == nil {
			t.Error("Expected error for invalid XML content")
		}
	})
}

func TestGetBodyValue(t *testing.T) {
	xmlBody := `<root><val>1</val></root>`
	val, _ := getBodyValue(xmlBody, "root.val")
	if val != "1" {
		t.Errorf("getBodyValue XML failed, got %s", val)
	}
}

func TestValidateResponse(t *testing.T) {
	resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
	resp.Header.Set("Content-Type", "application/json")
	body := `{"status": "ok", "code": 200}`

	tests := []struct {
		name       string
		assertions []Assertion
		wantValid  bool
	}{
		{"Empty assertions", []Assertion{}, true},
		{"Status check", []Assertion{{Source: "status", Operator: "==", Target: "200"}}, true},
		{"Body content", []Assertion{{Source: "body", Property: "status", Operator: "==", Target: "ok"}}, true},
		{"Body contains", []Assertion{{Source: "body", Operator: "contains", Target: "ok"}}, true},
		{"Header check", []Assertion{{Source: "header", Property: "Content-Type", Operator: "==", Target: "application/json"}}, true},
		{"Numeric Comparison", []Assertion{{Source: "body", Property: "code", Operator: ">=", Target: "100"}}, true},
		{"Numeric Comparison Less", []Assertion{{Source: "body", Property: "code", Operator: "<", Target: "300"}}, true},
		{"Numeric Comparison Less Equal", []Assertion{{Source: "body", Property: "code", Operator: "<=", Target: "200"}}, true},
		{"Numeric Comparison Greater", []Assertion{{Source: "body", Property: "code", Operator: ">", Target: "150"}}, true},
		{"Numeric Comparison Not Equal", []Assertion{{Source: "body", Property: "code", Operator: "!=", Target: "500"}}, true},
		{"Field Exists", []Assertion{{Source: "body", Property: "status", Operator: "exists"}}, true},
		{"Field Not Exists", []Assertion{{Source: "body", Property: "nonexistent", Operator: "not_exists"}}, true},
		{"Invalid Status", []Assertion{{Source: "status", Operator: "==", Target: "404"}}, false},
		{"Invalid Numerical op", []Assertion{{Source: "body", Property: "status", Operator: ">", Target: "100"}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valid, msg := validateResponse(resp, body, tt.assertions)
			if valid != tt.wantValid {
				t.Errorf("validateResponse() %s: valid = %v, want %v. Error: %s", tt.name, valid, tt.wantValid, msg)
			}
		})
	}
}


func TestRandomName(t *testing.T) {
	name := randomName()
	if name == "" {
		t.Error("randomName should return a non-empty string")
	}
	// Run multiple times to check it produces valid names
	names := map[string]bool{}
	for i := 0; i < 50; i++ {
		names[randomName()] = true
	}
	if len(names) < 2 {
		t.Error("randomName should produce variety")
	}
}

func TestExtractVars(t *testing.T) {
	t.Run("Extract from header", func(t *testing.T) {
		resp := &http.Response{Header: make(http.Header)}
		resp.Header.Set("X-Token", "secret123")
		vars := make(map[string]string)

		extractVars(resp, "", []Extraction{
			{Source: "header", Property: "X-Token", VarName: "token"},
		}, vars)

		if vars["token"] != "secret123" {
			t.Errorf("Expected secret123, got %s", vars["token"])
		}
	})

	t.Run("Extract from body with property", func(t *testing.T) {
		resp := &http.Response{Header: make(http.Header)}
		body := `{"id": "abc-123", "nested": {"val": 42}}`
		vars := make(map[string]string)

		extractVars(resp, body, []Extraction{
			{Source: "body", Property: "id", VarName: "userId"},
			{Source: "body", Property: "nested.val", VarName: "nestedVal"},
		}, vars)

		if vars["userId"] != "abc-123" {
			t.Errorf("Expected abc-123, got %s", vars["userId"])
		}
		if vars["nestedVal"] != "42" {
			t.Errorf("Expected 42, got %s", vars["nestedVal"])
		}
	})

	t.Run("Extract from body without property", func(t *testing.T) {
		resp := &http.Response{Header: make(http.Header)}
		body := `full body content`
		vars := make(map[string]string)

		extractVars(resp, body, []Extraction{
			{Source: "body", Property: "", VarName: "fullBody"},
		}, vars)

		if vars["fullBody"] != "full body content" {
			t.Errorf("Expected full body content, got %s", vars["fullBody"])
		}
	})

	t.Run("Extract with invalid JSON path", func(t *testing.T) {
		resp := &http.Response{Header: make(http.Header)}
		body := `{"a": 1}`
		vars := make(map[string]string)

		extractVars(resp, body, []Extraction{
			{Source: "body", Property: "nonexistent.path", VarName: "missing"},
		}, vars)

		if vars["missing"] != "" {
			t.Errorf("Expected empty string for invalid path, got %s", vars["missing"])
		}
	})

	t.Run("Extract with empty VarName is skipped", func(t *testing.T) {
		resp := &http.Response{Header: make(http.Header)}
		resp.Header.Set("X-Val", "test")
		vars := make(map[string]string)

		extractVars(resp, "", []Extraction{
			{Source: "header", Property: "X-Val", VarName: ""},
		}, vars)

		if len(vars) != 0 {
			t.Errorf("Expected no vars set for empty VarName, got %v", vars)
		}
	})
}

func TestValidateResponse_Additional(t *testing.T) {
	t.Run("Status >= 300 without assertions is failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 500, Header: make(http.Header)}
		valid, _ := validateResponse(resp, "", []Assertion{})
		if valid {
			t.Error("Expected false for 500 status with no assertions")
		}
	})

	t.Run("Header exists", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		resp.Header.Set("X-Custom", "value")
		valid, _ := validateResponse(resp, "", []Assertion{
			{Source: "header", Property: "X-Custom", Operator: "exists"},
		})
		if !valid {
			t.Error("Expected true for existing header")
		}
	})

	t.Run("Header not exists", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		valid, _ := validateResponse(resp, "", []Assertion{
			{Source: "header", Property: "X-Missing", Operator: "not_exists"},
		})
		if !valid {
			t.Error("Expected true for non-existing header")
		}
	})

	t.Run("Header exists failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		valid, msg := validateResponse(resp, "", []Assertion{
			{Source: "header", Property: "X-Missing", Operator: "exists"},
		})
		if valid {
			t.Error("Expected false for missing header with exists check")
		}
		if msg == "" {
			t.Error("Expected error message")
		}
	})

	t.Run("Header not_exists failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		resp.Header.Set("X-Present", "val")
		valid, msg := validateResponse(resp, "", []Assertion{
			{Source: "header", Property: "X-Present", Operator: "not_exists"},
		})
		if valid {
			t.Error("Expected false for existing header with not_exists check")
		}
		if msg == "" {
			t.Error("Expected error message")
		}
	})

	t.Run("Body field not found for comparison", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"a": 1}`
		valid, msg := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "missing_field", Operator: "==", Target: "x"},
		})
		if valid {
			t.Error("Expected false for missing body field")
		}
		if msg == "" {
			t.Error("Expected error message for missing field")
		}
	})

	t.Run("Body contains failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		valid, msg := validateResponse(resp, "hello world", []Assertion{
			{Source: "body", Operator: "contains", Target: "nothere"},
		})
		if valid {
			t.Error("Expected false for body not containing target")
		}
		if msg == "" {
			t.Error("Expected error message")
		}
	})

	t.Run("Body != failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"val": "same"}`
		valid, msg := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "val", Operator: "!=", Target: "same"},
		})
		if valid {
			t.Error("Expected false for != with equal values")
		}
		if msg == "" {
			t.Error("Expected error message")
		}
	})

	t.Run("Numeric > failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"n": 5}`
		valid, _ := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "n", Operator: ">", Target: "10"},
		})
		if valid {
			t.Error("Expected false for 5 > 10")
		}
	})

	t.Run("Numeric >= failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"n": 5}`
		valid, _ := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "n", Operator: ">=", Target: "10"},
		})
		if valid {
			t.Error("Expected false for 5 >= 10")
		}
	})

	t.Run("Numeric < failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"n": 20}`
		valid, _ := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "n", Operator: "<", Target: "10"},
		})
		if valid {
			t.Error("Expected false for 20 < 10")
		}
	})

	t.Run("Numeric <= failure", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		body := `{"n": 20}`
		valid, _ := validateResponse(resp, body, []Assertion{
			{Source: "body", Property: "n", Operator: "<=", Target: "10"},
		})
		if valid {
			t.Error("Expected false for 20 <= 10")
		}
	})

	t.Run("Header comparison not found", func(t *testing.T) {
		resp := &http.Response{StatusCode: 200, Header: make(http.Header)}
		valid, msg := validateResponse(resp, "", []Assertion{
			{Source: "header", Property: "X-Missing", Operator: "==", Target: "val"},
		})
		if valid {
			t.Error("Expected false for header not found")
		}
		if msg == "" {
			t.Error("Expected error message")
		}
	})
}

func TestGetJsonValue_Extended(t *testing.T) {
	t.Run("Empty path returns whole JSON", func(t *testing.T) {
		val, err := getJsonValue(`{"a":1}`, "")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if val != `{"a":1}` {
			t.Errorf("Expected whole JSON, got %s", val)
		}
	})

	t.Run("Null value", func(t *testing.T) {
		val, err := getJsonValue(`{"a":null}`, "a")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if val != "null" {
			t.Errorf("Expected null, got %s", val)
		}
	})

	t.Run("Nested object", func(t *testing.T) {
		val, err := getJsonValue(`{"a":{"b":{"c":"deep"}}}`, "a.b.c")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if val != "deep" {
			t.Errorf("Expected deep, got %s", val)
		}
	})

	t.Run("Field not found", func(t *testing.T) {
		_, err := getJsonValue(`{"a":1}`, "b")
		if err == nil {
			t.Error("Expected error for non-existing field")
		}
	})

	t.Run("Invalid JSON", func(t *testing.T) {
		_, err := getJsonValue(`not json`, "a")
		if err == nil {
			t.Error("Expected error for invalid JSON")
		}
	})

	t.Run("Access field on non-object", func(t *testing.T) {
		_, err := getJsonValue(`{"a": 123}`, "a.b")
		if err == nil {
			t.Error("Expected error accessing field on non-object")
		}
	})

	t.Run("Array first element", func(t *testing.T) {
		val, err := getJsonValue(`{"items":[{"id":"first"},{"id":"second"}]}`, "items[0].id")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if val != "first" {
			t.Errorf("Expected first, got %s", val)
		}
	})
}

func TestGetXmlValue_Extended(t *testing.T) {
	t.Run("Valid XML extraction", func(t *testing.T) {
		xml := `<root><user><name>John</name></user></root>`
		val, err := getXmlValue(xml, "root.user.name")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
		if val != "John" {
			t.Errorf("Expected John, got %s", val)
		}
	})

	t.Run("Field not found in XML", func(t *testing.T) {
		xml := `<root><a>1</a></root>`
		_, err := getXmlValue(xml, "root.b")
		if err == nil {
			t.Error("Expected error for non-existing field")
		}
	})
}

func TestRandomString(t *testing.T) {
	s := randomString(20)
	if len(s) != 20 {
		t.Errorf("Expected length 20, got %d", len(s))
	}
}

func TestFormatTelephone(t *testing.T) {
	result := formatTelephone("(##) #####-####")
	if len(result) != len("(##) #####-####") {
		t.Errorf("Expected same format length, got %s", result)
	}
	// Should have digits where # was
	if result[1] < '0' || result[1] > '9' {
		t.Errorf("Expected digit in formatted phone, got %c", result[1])
	}
}
