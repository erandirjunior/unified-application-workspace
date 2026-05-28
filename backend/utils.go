package main

import (
	"crypto/rand"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	mrand "math/rand"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

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
					if val, err := strconv.Atoi(parts[0]); err == nil { max = val }
				} else if len(parts) >= 2 {
					if v1, err := strconv.Atoi(parts[0]); err == nil { min = v1 }
					if v2, err := strconv.Atoi(parts[1]); err == nil { max = v2 }
				}
			}
			if max <= min { sb.WriteString(strconv.Itoa(min)) } else { sb.WriteString(strconv.Itoa(mrand.Intn(max-min+1) + min)) }
		case "float":
			min, max := 0.0, 1.0
			if p.Format != "" {
				parts := strings.Split(p.Format, ":")
				if len(parts) == 1 {
					if val, err := strconv.ParseFloat(parts[0], 64); err == nil { max = val }
				} else if len(parts) >= 2 {
					if v1, err := strconv.ParseFloat(parts[0], 64); err == nil { min = v1 }
					if v2, err := strconv.ParseFloat(parts[1], 64); err == nil { max = v2 }
				}
			}
			val := min + mrand.Float64()*(max-min)
			sb.WriteString(fmt.Sprintf("%.2f", val))
		case "string":
			length := 10
			if p.Format != "" {
				if val, err := strconv.Atoi(p.Format); err == nil { length = val }
			}
			sb.WriteString(randomString(length))
		case "name":
			sb.WriteString(randomName())
		case "tel", "telephone":
			format := "(##) #####-####"
			if p.Format != "" { format = p.Format }
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
	for i := range b { b[i] = charset[mrand.Intn(len(charset))] }
	return string(b)
}

func randomName() string {
	names := []string{"Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Henry", "Isabella", "Jack", "Karl", "Luna", "Mike", "Nina", "Oscar", "Paul", "Quinn", "Rosa", "Sam", "Tina"}
	return names[mrand.Intn(len(names))]
}

func formatTelephone(format string) string {
	var result strings.Builder
	for _, char := range format {
		if char == '#' { result.WriteString(fmt.Sprintf("%d", mrand.Intn(10))) } else { result.WriteRune(char) }
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
	if err := json.Unmarshal([]byte(jsonString), &data); err != nil { return "", err }
	path = strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(path, "$."), "$"), ".")
	if path == "" {
		res, _ := json.Marshal(data)
		return string(res), nil
	}
	current := data
	segments := strings.Split(path, ".")
	reArrayIndex := regexp.MustCompile(`^([^\[\]]*)\[(\d+)\]$`)
	for _, segment := range segments {
		arrayMatch := reArrayIndex.FindStringSubmatch(segment)
		if arrayMatch != nil {
			key, indexStr := arrayMatch[1], arrayMatch[2]
			if key != "" { if m, ok := current.(map[string]interface{}); ok { current = m[key] } }
			if arr, ok := current.([]interface{}); ok {
				idx, _ := strconv.Atoi(indexStr)
				if idx >= 0 && idx < len(arr) { current = arr[idx] } else { return "", fmt.Errorf("index out of bounds") }
			}
		} else if m, ok := current.(map[string]interface{}); ok { current = m[segment] } else { return "", fmt.Errorf("field not found") }
	}
	if current == nil { return "null", nil }
	if s, ok := current.(string); ok { return s, nil }
	res, _ := json.Marshal(current)
	return string(res), nil
}

func getXmlValue(xmlString string, path string) (string, error) {
	path = strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(path, "$."), "$"), ".")
	parts := strings.Split(path, ".")
	decoder := xml.NewDecoder(strings.NewReader(xmlString))
	var stack []string
	for {
		token, err := decoder.Token()
		if err == io.EOF { break }
		if err != nil { return "", err }
		switch el := token.(type) {
		case xml.StartElement:
			stack = append(stack, el.Name.Local)
			if len(stack) == len(parts) {
				match := true
				for i, segment := range parts {
					if stack[i] != segment { match = false; break }
				}
				if match {
					var val string
					decoder.DecodeElement(&val, &el)
					return val, nil
				}
			}
		case xml.EndElement:
			if len(stack) > 0 { stack = stack[:len(stack)-1] }
		}
	}
	return "", fmt.Errorf("field not found")
}

func getBodyValue(body, path string) (string, error) {
	trimmed := strings.TrimSpace(body)
	if strings.HasPrefix(trimmed, "<") { return getXmlValue(body, path) }
	return getJsonValue(body, path)
}

func flattenHeaders(h http.Header) map[string]string {
	m := make(map[string]string)
	for k, v := range h { m[k] = strings.Join(v, ", ") }
	return m
}

func validateResponse(resp *http.Response, body string, assertions []Assertion) (bool, string) {
	if len(assertions) == 0 {
		return resp.StatusCode >= 200 && resp.StatusCode < 300, ""
	}
	for _, a := range assertions {
		var actual string
		var err error
		fieldFound := true
		switch a.Source {
		case "status":
			actual = strconv.Itoa(resp.StatusCode)
		case "body":
			if a.Property != "" {
				actual, err = getBodyValue(body, a.Property)
				if err != nil { fieldFound = false }
			} else {
				actual = body
			}
		case "header":
			actual = resp.Header.Get(a.Property)
			if _, exists := resp.Header[http.CanonicalHeaderKey(a.Property)]; !exists {
				fieldFound = false
			}
		}
		if a.Operator == "exists" {
			if !fieldFound { return false, fmt.Sprintf("%s '%s' não encontrado", a.Source, a.Property) }
			continue
		}
		if a.Operator == "not_exists" {
			if fieldFound { return false, fmt.Sprintf("%s '%s' encontrado, mas esperava que não existisse", a.Source, a.Property) }
			continue
		}
		if !fieldFound {
			if err != nil { return false, fmt.Sprintf("Erro ao acessar %s '%s': %v", a.Source, a.Property, err) }
			return false, fmt.Sprintf("%s '%s' não encontrado para comparação", a.Source, a.Property)
		}
		switch a.Operator {
		case "==":
			if actual != a.Target { return false, fmt.Sprintf("Esperado %s %s ser %s, mas recebeu %s", a.Source, a.Property, a.Target, actual) }
		case "!=":
			if actual == a.Target { return false, fmt.Sprintf("Esperado %s %s ser diferente de %s", a.Source, a.Property, a.Target) }
		case "contains":
			if !strings.Contains(actual, a.Target) { return false, fmt.Sprintf("%s %s não contém %s", a.Source, a.Property, a.Target) }
		case ">", ">=", "<", "<=":
			vActual, err1 := strconv.ParseFloat(actual, 64)
			vTarget, err2 := strconv.ParseFloat(a.Target, 64)
			if err1 == nil && err2 == nil {
				if a.Operator == ">" && !(vActual > vTarget) { return false, fmt.Sprintf("%s %s (%v) não é > %v", a.Source, a.Property, vActual, vTarget) }
				if a.Operator == ">=" && !(vActual >= vTarget) { return false, fmt.Sprintf("%s %s (%v) não é >= %v", a.Source, a.Property, vActual, vTarget) }
				if a.Operator == "<" && !(vActual < vTarget) { return false, fmt.Sprintf("%s %s (%v) não é < %v", a.Source, a.Property, vActual, vTarget) }
				if a.Operator == "<=" && !(vActual <= vTarget) { return false, fmt.Sprintf("%s %s (%v) não é <= %v", a.Source, a.Property, vActual, vTarget) }
			} else {
				return false, fmt.Sprintf("Impossível realizar comparação numérica em %s %s (valores: %s, %s)", a.Source, a.Property, actual, a.Target)
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
			val = resp.Header.Get(e.Property)
		case "body":
			if e.Property != "" {
				extractedVal, err := getJsonValue(body, e.Property)
				if err == nil { val = extractedVal }
			} else {
				val = body
			}
		}
		if e.VarName != "" {
			vars[e.VarName] = val
		}
	}
}