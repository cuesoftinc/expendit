package handler

import (
	"context"
	"github.com/cuesoftinc/expendit/api/common/internal/database"
	helper "github.com/cuesoftinc/expendit/api/common/internal/helper"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/util"
	"github.com/cuesoftinc/expendit/api/common/internal/validation"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"google.golang.org/api/idtoken"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var userCollection *mongo.Collection = database.OpenCollection(database.Client, "user")
var validate = validator.New()

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func VerifyPassword(userHashedPassword string, providedPassword string) (bool, string) {
	err := bcrypt.CompareHashAndPassword([]byte(userHashedPassword), []byte(providedPassword))
	if err != nil {
		return false, "email or password is not correct"
	}
	return true, ""
}

func Signup() gin.HandlerFunc {

	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()
		var user model.User

		if err := c.BindJSON(&user); err != nil {
			log.Println("Error binding JSON:", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		validationErr := validate.Struct(user)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		count, err := userCollection.CountDocuments(ctx, bson.M{"email": user.Email})
		if err != nil {
			log.Println("error checking email:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while checking for the user"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "email already exist, try using another email",
			})
			return
		}

		if !validation.IsStrongPassword(*user.Password) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "password must be at least 8 characters long and contain uppercase, lowercase, number and special character",
			})
			return
		}

		password, err := HashPassword(*user.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while processing the password"})
			return
		}
		user.Password = &password

		count, err = userCollection.CountDocuments(ctx, bson.M{"phone": user.Phone})
		if err != nil {
			log.Println("error checking phone:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while checking for phone number"})
			return
		}
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "phone number already exists",
			})
			return
		}
		provider := "local"
		user.Provider = &provider
		userType := "USER"
		user.User_type = &userType
		user.Created_at, _ = time.Parse(time.RFC3339, time.Now().Format(time.RFC3339))
		user.Updated_at, _ = time.Parse(time.RFC3339, time.Now().Format(time.RFC3339))
		user.ID = primitive.NewObjectID()
		user.User_id = user.ID.Hex()
		token, refreshToken, _ := helper.GenerateAllTokens(*user.Email, *user.First_name, *user.Last_name, *user.User_type, *&user.User_id)
		user.Token = &token
		user.Refresh_token = &refreshToken

		resultInsertionNumber, insertErr := userCollection.InsertOne(ctx, user)
		if insertErr != nil {
			msg := fmt.Sprintf("User item was not created")
			c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "successful", "inserted_id": resultInsertionNumber})
	}
}

func Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var user model.User
		var foundUser model.User

		if err := c.BindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Ensure the lookup filter is a concrete string value (defence in depth).
		if user.Email == nil || *user.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email or password is incorrect"})
			return
		}

		err := userCollection.FindOne(ctx, bson.M{"email": user.Email}).Decode(&foundUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "email or password is incorrect"})
			return
		}

		// Check if the user is found based on the email
		if *foundUser.Email == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(*foundUser.Password), []byte(*user.Password))
		if err != nil {
			log.Printf("Password verification failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "email or password is incorrect"})
			return
		}

		token, refreshToken, _ := helper.GenerateAllTokens(*foundUser.Email, *foundUser.First_name, *foundUser.Last_name, *foundUser.User_type, foundUser.User_id)
		helper.UpdateAllTokens(token, refreshToken, foundUser.User_id)

		foundUser.Token = &token
		foundUser.Refresh_token = &refreshToken

		c.JSON(http.StatusOK, foundUser)
	}
}

func GoogleAuth() gin.HandlerFunc {
	return func(c *gin.Context) {

		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var body struct {
			Token string `json:"token"`
		}

		if err := c.BindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid request body",
			})
			return
		}

		// VERIFY GOOGLE TOKEN
		payload, err := idtoken.Validate(
			context.Background(),
			body.Token,
			os.Getenv("GOOGLE_CLIENT_ID"),
		)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid google token",
			})
			return
		}

		// EXTRACT GOOGLE USER INFO
		email := payload.Claims["email"].(string)

		firstName := ""
		lastName := ""

		if payload.Claims["given_name"] != nil {
			firstName = payload.Claims["given_name"].(string)
		}

		if payload.Claims["family_name"] != nil {
			lastName = payload.Claims["family_name"].(string)
		}

		var foundUser model.User

		err = userCollection.FindOne(
			ctx,
			bson.M{"email": email},
		).Decode(&foundUser)

		// USER DOESN'T EXIST -> CREATE ACCOUNT
		if err == mongo.ErrNoDocuments {

			id := primitive.NewObjectID()

			userType := "USER"
			provider := "google"

			newUser := model.User{
				ID:         id,
				User_id:    id.Hex(),
				Email:      &email,
				First_name: &firstName,
				Last_name:  &lastName,
				User_type:  &userType,
				Provider:   &provider,
			}

			newUser.Created_at = time.Now()
			newUser.Updated_at = time.Now()

			token, refreshToken, _ := helper.GenerateAllTokens(
				email,
				firstName,
				lastName,
				userType,
				newUser.User_id,
			)

			newUser.Token = &token
			newUser.Refresh_token = &refreshToken

			_, insertErr := userCollection.InsertOne(ctx, newUser)

			if insertErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "failed to create google user",
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "google signup successful",
				"user":    newUser,
			})

			return
		}

		// OTHER DATABASE ERROR
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "database error",
			})
			return
		}

		// USER EXISTS -> LOGIN

		token, refreshToken, _ := helper.GenerateAllTokens(
			*foundUser.Email,
			*foundUser.First_name,
			*foundUser.Last_name,
			*foundUser.User_type,
			foundUser.User_id,
		)

		helper.UpdateAllTokens(
			token,
			refreshToken,
			foundUser.User_id,
		)

		foundUser.Token = &token
		foundUser.Refresh_token = &refreshToken

		c.JSON(http.StatusOK, gin.H{
			"message": "google login successful",
			"user":    foundUser,
		})
	}
}

func GetUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := helper.CheckUserType(c, "ADMIN"); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		recordPerPage, err := strconv.Atoi(c.Query("recodePerPage"))
		if err != nil || recordPerPage < 1 {
			recordPerPage = 10
		}
		page, err1 := strconv.Atoi(c.Query("page"))
		if err1 != nil || page < 1 {
			page = 1
		}

		startIndex := (page - 1) * recordPerPage
		startIndex, err = strconv.Atoi(c.Query("startIndex"))

		matchStage := bson.D{{Key: "$match", Value: bson.D{{}}}}
		groupStage := bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{{Key: "_id", Value: "null"}}},
			{Key: "total_count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "data", Value: bson.D{{Key: "$push", Value: "$$ROOT"}}}}}}
		projectStage := bson.D{
			{Key: "$project", Value: bson.D{
				{Key: "_id", Value: 0},
				{Key: "total_count", Value: 1},
				{Key: "user_items", Value: bson.D{{Key: "$slice", Value: []interface{}{"$data", startIndex, recordPerPage}}}}}}}
		result, err := userCollection.Aggregate(ctx, mongo.Pipeline{
			matchStage, groupStage, projectStage})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while fetching user items"})
			return
		}
		var allusers []bson.M
		if err = result.All(ctx, &allusers); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while decoding user items"})
			return
		}
		if len(allusers) == 0 {
			c.JSON(http.StatusOK, gin.H{"total_count": 0, "user_items": []bson.M{}})
			return
		}
		c.JSON(http.StatusOK, allusers[0])
	}
}

func GetUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("user_id")

		if err := helper.MatchUserTypeToUid(c, userId); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var user model.User
		err := userCollection.FindOne(ctx, bson.M{"user_id": userId}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, user)

	}
}

func ChangePassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		// Get user ID from context
		userId, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "uid not found in context"})
			return
		}

		var changePasswordRequest model.ChangePasswordRequest

		if err := c.BindJSON(&changePasswordRequest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate the request data
		validationErr := validate.Struct(changePasswordRequest)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}

		// Get the user from the database
		var user model.User
		err := userCollection.FindOne(ctx, bson.M{"user_id": userId}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while fetching user data"})
			return
		}

		// Verify the old password (hash first, provided password second)
		passwordIsValid, msg := VerifyPassword(*user.Password, *changePasswordRequest.OldPassword)
		if !passwordIsValid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
			return
		}

		// Hash the new password
		newHashedPassword, err := HashPassword(*changePasswordRequest.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while processing the password"})
			return
		}

		// Update the user's password in the database
		update := bson.M{"$set": bson.M{"password": newHashedPassword}}
		filter := bson.M{"user_id": userId}

		_, err = userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while updating password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
	}
}

func UpdateUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		userId, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "uid not found in context"})
			return
		}

		var updatedUserData model.User

		if err := c.BindJSON(&updatedUserData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate the updated user data
		validationErr := validate.Struct(updatedUserData)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}

		// Get the user from the database
		var existingUser model.User
		err := userCollection.FindOne(ctx, bson.M{"user_id": userId}).Decode(&existingUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while fetching user data"})
			return
		}

		existingUser.First_name = updatedUserData.First_name
		existingUser.Last_name = updatedUserData.Last_name
		existingUser.Email = updatedUserData.Email
		existingUser.Phone = updatedUserData.Phone
		// User_type is intentionally NOT taken from the request body — letting a
		// user set their own role would be self-service privilege escalation.
		existingUser.Updated_at = time.Now()

		update := bson.M{"$set": existingUser}
		filter := bson.M{"user_id": userId}

		_, err = userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while updating user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User updated successfully", "updated_user": existingUser})
	}
}

func ForgotPassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()
		var resetPasswordEmailRequest model.ForgotPasswordRequest
		if err := c.BindJSON(&resetPasswordEmailRequest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		validationErr := validate.Struct(resetPasswordEmailRequest)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}

		var user model.User
		err := userCollection.FindOne(ctx, bson.M{"email": resetPasswordEmailRequest.Email}).Decode(&user)
		if err != nil {
			// Instead of returning 404, just respond with success message
			c.JSON(http.StatusOK, gin.H{"message": "Reset password email sent successfully"})
			return
		}

		resetToken, err := util.GenerateToken(*user.Email)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"message": "Reset password email sent successfully"})
			return
		}

		// Update the user with the reset token in the database

		update := bson.M{"$set": bson.M{"reset_token": resetToken}}
		filter := bson.M{"email": resetPasswordEmailRequest.Email}

		_, err = userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while updating reset token"})
			return
		}

		// Send reset password email with the reset token
		err = util.SendResetPasswordEmail(*user.Email, resetToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while sending reset password email", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Reset password email sent successfully"})
	}
}

func ResetPassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		var resetPasswordRequest model.ResetPasswordRequest
		if err := c.BindJSON(&resetPasswordRequest); err != nil {
			log.Printf("Error binding JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		validationErr := validate.Struct(resetPasswordRequest)
		if validationErr != nil {
			log.Printf("Validation error: %v", validationErr)
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		resetToken := c.Query("reset_token")
		if resetToken == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "reset_token parameter is required"})
			return
		}

		claims, err := util.ParseToken(resetToken)
		if err != nil {
			log.Printf("Error parsing reset token: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired reset token"})
			return
		}

		log.Printf("Reset password request received for user ID: %s", claims.Subject)

		newHashedPassword, err := HashPassword(*resetPasswordRequest.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while processing the password"})
			return
		}
		filter := bson.M{"email": claims.Subject}
		update := bson.M{"$set": bson.M{"password": newHashedPassword}, "$unset": bson.M{"reset_token": ""}}
		result, err := userCollection.UpdateOne(ctx, filter, update)
		if err != nil {
			log.Printf("Error updating password: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while updating password"})
			return
		}

		log.Printf("Password update result: %+v", result)

		if result.ModifiedCount == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password not updated"})
			return
		}

		var updatedUser model.User
		err = userCollection.FindOne(ctx, bson.M{"email": claims.Subject}).Decode(&updatedUser)
		if err != nil {
			log.Printf("Error fetching updated user details: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error occurred while fetching updated user details"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully", "userdetails": updatedUser})
	}
}

func Logout() gin.HandlerFunc {
	return func(c *gin.Context) {
		var ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		uid, _ := c.Get("uid")

		update := bson.M{"$unset": bson.M{"token": "", "refresh_token": ""}}
		_, err := userCollection.UpdateOne(ctx, bson.M{"user_id": uid}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
	}
}
