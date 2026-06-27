package main

import (
	"fmt"
	"net/http"
	"os"
)

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

	fmt.Println("🚀 Unified Application Workspace Backend is running.")
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Println(err)
	}
}
