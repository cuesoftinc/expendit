package router

import (
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	middleware "github.com/cuesoftinc/expendit/api/common/internal/middleware"

	"github.com/gin-gonic/gin"
)

func UserRoutes(incomingRoutes *gin.Engine) {

	// PUBLIC ROUTES
	incomingRoutes.POST("/signup", handler.Signup())
	incomingRoutes.POST("/login", middleware.LoginRateLimit(), handler.Login())
	incomingRoutes.POST("/auth/google", handler.GoogleAuth())

	// PROTECTED ROUTES — identity comes from the JWT (uid claim) only.
	protected := incomingRoutes.Group("/")
	protected.Use(middleware.Authenticate())

	{
		protected.POST("/logout", handler.Logout())
		protected.GET("/users", handler.GetUsers())
		protected.GET("/users/:user_id", handler.GetUser())
		protected.PUT("/users/change-password", handler.ChangePassword())
		protected.PUT("/users/:id", handler.UpdateUser())
	}
}
