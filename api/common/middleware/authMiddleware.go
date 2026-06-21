package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"expendit-server/database"
	helper "expendit-server/helpers"
	"expendit-server/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var authUserCollection *mongo.Collection = database.OpenCollection(database.Client, "user")

func Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.Request.Header.Get("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No Authorization header provided"})
			c.Abort()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		}

		clientToken := tokenParts[1]

		claims, errMsg := helper.ValidateToken(clientToken)
		if errMsg != "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": errMsg})
			c.Abort()
			return
		}

		// Verify the token matches what's stored in DB so logout actually works.
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var user models.User
		if dbErr := authUserCollection.FindOne(ctx, bson.M{"user_id": claims.Uid}).Decode(&user); dbErr != nil || user.Token == nil || *user.Token != clientToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "session expired, please login again"})
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
