package middleware

import (
	"github.com/gin-gonic/gin"
	"net/http"

)

// AuthMiddleware is a middleware to extract user_id from the request
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract user_id from the request, you might get it from a token or session
		userID := c.GetHeader("X-UserID") // Adjust this based on your authentication method

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Add user_id to the context
		c.Set("user_id", userID)

		// Continue with the next handler
		c.Next()
	}
}