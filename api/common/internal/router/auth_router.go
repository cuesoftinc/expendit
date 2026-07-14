package router

import (
	"expendit-server/internal/handler"
	"expendit-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.POST("/users/signup", handler.Signup())
	incomingRoutes.POST("/users/signin", middleware.LoginRateLimit(), handler.Login())
	incomingRoutes.POST("/users/forgot-password", middleware.PasswordRateLimit(), handler.ForgotPassword())
	incomingRoutes.PATCH("/users/reset-password", middleware.PasswordRateLimit(), handler.ResetPassword())
}
