package main 

import (
	"os"
	"log"
	"fmt"
	"github.com/gin-gonic/gin"
    routes	"expendit-server/routes" 
		"expendit-server/controllers" 
	"github.com/joho/godotenv"
	// "github.com/gin-contrib/cors"
	"expendit-server/middleware"
)

func main() {
	err := godotenv.Load(".env")

	if err != nil {
		log.Fatal("Error loading .env file")
	}
	port := os.Getenv("PORT")

	if port == "" {
		port = "9000"
	} 

	router := gin.New()
	router.Use(gin.Logger())
	router.Use(middleware.CORSMiddleware())
	
	routes.AuthRoutes(router)
	routes.UserRoutes(router)
    routes.ExpenseRoutes(router)
	routes.IncomeRoutes(router)
	routes.CategoryRoutes(router)
	routes.ReportRoutes(router)   

	err = controller.CreateCategories()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Categories initialization completed.")

	router.GET("/api-1", func(c *gin.Context){
		c.JSON(200, gin.H{"success": "Access granted for api-1"})
	})

	router.GET("/api-2", func(c *gin.Context){
		c.JSON(200, gin.H{"success": "Access granted for api-2"})
	})

	router.Run(":" + port)
}