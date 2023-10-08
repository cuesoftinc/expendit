package main

import (
	"fmt"

	" go get -u github.com/gin-gonic/gin"
	"net/http"
)


func main() {
    http.HandleFunc("/", helloHandler)
    port := ":8080"
    fmt.Printf("Server is listening on %s...\n", port)
    http.ListenAndServe(port, nil)
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello, World!")
}