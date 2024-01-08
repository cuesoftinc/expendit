package utils

import (
	"fmt"
	"time"
	"os"

	// "github.com/gin-gonic/gin"
	"github.com/dgrijalva/jwt-go"
)


var SECRET_KEY string = os.Getenv("SECRET_KEY")


// Define a secret key for JWT
var jwtSecret = []byte(SECRET_KEY)

// Encode function to generate a JWT token
func EncodeToken(userId string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userId,
		"exp":     time.Now().Add(time.Minute * 10).Unix(), 
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Decode function to validate and extract information from a JWT token
func DecodeToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Check the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		return jwtSecret, nil
	})

	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("Invalid token")
	}

	userId, ok := claims["user_id"].(string)
	if !ok {
		return "", fmt.Errorf("Invalid user_id in token")
	}

	return userId, nil
}