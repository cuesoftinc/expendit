package routes 


import (
	"expendit-server/controllers"
	"github.com/gin-gonic/gin"
)

func AuthRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.POST("users/signup", controller.Signup())
	incomingRoutes.POST("users/signin", controller.Login())
	incomingRoutes.POST("/users/forgot-password", controller.ForgotPassword())
    // incomingRoutes.PUT("/users/reset-password/:resetToken", controller.ResetPassword())
}