package helper

import (
	"context"
	"expendit-server/internal/database"
	"fmt"
	"log/slog"
	"os"
	"time"

	jwt "github.com/golang-jwt/jwt/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type SignedDetails struct {
	Email      string
	First_name string
	Last_name  string
	Uid        string
	User_type  string
	jwt.StandardClaims
}

var userCollection *mongo.Collection = database.OpenCollection(database.Client, "user")

// secretKey reads JWT_SECRET at call time — a package-level read would run at
// init, before .env is loaded, and silently sign with an empty key.
func secretKey() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

func GenerateAllTokens(email string, firstName string, lastName string, userType string, uid string) (signedToken string, signedRefreshToken string, err error) {
	claims := &SignedDetails{
		Email:      email,
		First_name: firstName,
		Last_name:  lastName,
		Uid:        uid,
		User_type:  userType,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Local().Add(time.Hour * time.Duration(24)).Unix(),
		},
	}

	refreshClaims := &SignedDetails{
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Local().Add(time.Hour * time.Duration(168)).Unix(),
		},
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secretKey())
	if err != nil {
		return "", "", err
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(secretKey())
	if err != nil {
		return "", "", err
	}
	return token, refreshToken, nil
}

func ValidateToken(signedToken string) (claims *SignedDetails, msg string) {
	token, err := jwt.ParseWithClaims(
		signedToken,
		&SignedDetails{},
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return secretKey(), nil
		},
	)
	if err != nil {
		return nil, err.Error()
	}

	claims, ok := token.Claims.(*SignedDetails)
	if !ok {
		return nil, "the token is invalid"
	}
	if claims.ExpiresAt < time.Now().Local().Unix() {
		return nil, "token has expired"
	}
	return claims, ""
}

func UpdateAllTokens(signedToken string, signedRefreshToken string, userId string) {
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	var updateObj primitive.D
	updateObj = append(updateObj, bson.E{Key: "token", Value: signedToken})
	updateObj = append(updateObj, bson.E{Key: "refresh_token", Value: signedRefreshToken})

	updatedAt, _ := time.Parse(time.RFC3339, time.Now().Format(time.RFC3339))
	updateObj = append(updateObj, bson.E{Key: "updated_at", Value: updatedAt})

	upsert := true
	filter := bson.M{"user_id": userId}
	opt := options.UpdateOptions{Upsert: &upsert}

	if _, err := userCollection.UpdateOne(
		ctx,
		filter,
		bson.D{{Key: "$set", Value: updateObj}},
		&opt,
	); err != nil {
		// A failed token persist must not kill the process; the login response
		// still carries the freshly signed tokens.
		slog.Error("failed to persist refreshed tokens", "error", err, "user_id", userId)
	}
}
