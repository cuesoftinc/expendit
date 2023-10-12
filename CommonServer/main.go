package main

import (
    "example.com/greeting/configs"
	"github.com/gin-gonic/gin"
	// "net/http"
)


func main() {
    router := gin.Default()
    configs.ConnectDB()
    router.Run("localhost:8080")
}
