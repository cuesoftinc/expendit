package routes


import (
	 "expendit-server/controllers"
   middleware "expendit-server/middleware"
	"github.com/gin-gonic/gin"
)

func UserRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.Use(middleware.Authenticate())
	incomingRoutes.Use(middleware.AuthMiddleware())
	incomingRoutes.GET("/users",controller.GetUsers())
	incomingRoutes.GET("/users/:user_id",controller.GetUser())
	incomingRoutes.PUT("/users/change-password", controller.ChangePassword())
<<<<<<< HEAD
  incomingRoutes.PUT("/users/:id", controller.UpdateUser())
=======
    incomingRoutes.PUT("/users/:id", controller.UpdateUser())
	incomingRoutes.POST("/users/forgot-password", controller.ForgotPassword())
    incomingRoutes.PUT("/users/reset-password/:resetToken", controller.ResetPassword())
>>>>>>> fc839ab04d760f9c674a4d0a96debd699c968366
}