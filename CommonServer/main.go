package main

import (
    "expendit-server/controller"
    "expendit-server/database"
    "expendit-server/models"
    "fmt"
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "log"
)

func main() {
    loadEnv()
    loadDatabase()
    serveApplication()
}

func loadEnv() {
    err := godotenv.Load(".env.local")
    if err != nil {
        log.Fatal("Error loading .env file")
    }
}

func loadDatabase() {
    database.Connect()
    database.Database.AutoMigrate(&models.User{})
    database.Database.AutoMigrate(&models.Expense{})
    database.Database.AutoMigrate(&models.Authentication{})
    database.Database.AutoMigrate(&models.Income{})
}

func serveApplication() {
    router := gin.Default()

    publicRoutes := router.Group("/auth")
    publicRoutes.POST("/register", controller.Register)
    publicRoutes.POST("/login", controller.Login)

    router.Run(":8000")
    fmt.Println("Server running on port 8000")
}