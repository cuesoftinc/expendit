package utils

import (
	"context"
	"fmt"
	"github.com/golang-jwt/jwt/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"os"
	"time"
)

type Claims struct {
	jwt.RegisteredClaims
}

// GenerateToken Generate JWT Token
func GenerateToken(email string) (string, error) {
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)),
			Issuer:    "CuesoftCloud",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func AuthenticateInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	md, ok := metadata.FromIncomingContext(ctx)

	if !ok {
		return nil, fmt.Errorf("missing context metadata")
	}

	authorization := md.Get("authorization")

	if len(authorization) == 0 || len(authorization[0]) < 7 || authorization[0][:6] != "Bearer" {
		return nil, fmt.Errorf("missing or invalid authorization bearer token")
	}

	tokenString := authorization[0][7:]

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil || !tkn.Valid {
		return nil, fmt.Errorf("invalid authorization bearer token")
	}

	return handler(ctx, req)
}
