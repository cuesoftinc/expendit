package helper

import (
    "expendit-server/models"
    "github.com/golang-jwt/jwt/v4"
    "os"
    "strconv"
    "time"
)

var privateKey = []byte(os.Getenv("JWT_PRIVATE_KEY"))

func GenerateJWT(user models.User) (string, error) {
    tokenTTL, _ := strconv.Atoi(os.Getenv("TOKEN_TTL"))
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "id":  user.ID,
        "iat": time.Now().Unix(),
        "eat": time.Now().Add(time.Second * time.Duration(tokenTTL)).Unix(),
    })
    return token.SignedString(privateKey)
}