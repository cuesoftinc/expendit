package routes

import (
	controller "expendit-server/controllers"
	middleware "expendit-server/middleware"

	"github.com/gin-gonic/gin"
)

func UserRoutes(incomingRoutes *gin.Engine) {

	// PUBLIC ROUTES
	incomingRoutes.POST("/signup", controller.Signup())
	incomingRoutes.POST("/login", middleware.LoginRateLimit(), controller.Login())
	incomingRoutes.POST("/auth/google", controller.GoogleAuth())

	// PROTECTED ROUTES
	protected := incomingRoutes.Group("/")
	protected.Use(middleware.Authenticate())
	protected.Use(middleware.AuthMiddleware())

	{
		protected.POST("/logout", controller.Logout())
		protected.GET("/users", controller.GetUsers())
		protected.GET("/users/:user_id", controller.GetUser())
		protected.PUT("/users/change-password", controller.ChangePassword())
		protected.PUT("/users/:id", controller.UpdateUser())
	}
}
