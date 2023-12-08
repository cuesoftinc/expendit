package middleware


import (
	"fmt"
	"net/http"
	
	helper "expendit-server/helpers"
	"github.com/gin-gonic/gin"
)


func Authenticate() gin.HandlerFunc{
       return func(c *gin.Context){
		if c.Request.Method == "OPTIONS" {
			// Handle preflight request
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Token") 
			c.Writer.WriteHeader(http.StatusNoContent)
			c.Abort()
			return
		}
		clientToken := c.Request.Header.Get("token")
		if clientToken == ""{
			c.JSON(http.StatusInternalServerError, gin.H{"error":fmt.Sprintf("No Authorization header provided")})
		    c.Abort()
			return
		}
		claims, err := helper.ValidateToken(clientToken)

		if err !=""{
			c.JSON(http.StatusInternalServerError, gin.H{"error":err})
			c.Abort()
			return
		}
		c.Set("email", claims.Email)
		c.Set("first_name", claims.First_name)
		c.Set("last_name", claims.Last_name)
		c.Set("uid", claims.Uid)
		c.Set("user_type", claims.User_type)
		c.Next()
	   }
}