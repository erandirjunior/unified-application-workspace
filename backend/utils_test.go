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