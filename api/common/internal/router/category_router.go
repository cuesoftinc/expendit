package router

import (
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/gin-gonic/gin"
)

func CategoryRoutes(incomingRoutes *gin.Engine) {
	// Scoped group: all category routes require auth. (The reads previously
	// relied on auth leaked from IncomeRoutes' engine-wide Use; making it
	// explicit preserves that effective behavior.)
	category := incomingRoutes.Group("/category", middleware.Authenticate())
	category.GET("", handler.GetCategories())
	category.GET("/:id", handler.GetCategoryById())
	category.POST("/create", handler.CreateCategory())
	category.PUT("/:id", handler.UpdateCategory())
	category.DELETE("/:id", handler.DeleteCategory())
	category.GET("/search", handler.SearchCategory())
}
