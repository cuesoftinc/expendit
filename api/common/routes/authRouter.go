package routes

import (
	"expendit-server/controllers"
	"expendit-server/middleware"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.POST("users/signup", controller.Signup())
	incomingRoutes.POST("users/signin", middleware.LoginRateLimit(), controller.Login())
	incomingRoutes.POST("/users/forgot-password", middleware.PasswordRateLimit(), controller.ForgotPassword())
	incomingRoutes.PATCH("/users/reset-password", middleware.PasswordRateLimit(), controller.ResetPassword())
}
