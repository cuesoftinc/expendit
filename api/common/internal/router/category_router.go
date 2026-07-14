package router



import (
	"expendit-server/internal/handler"
	"expendit-server/internal/middleware"
	"github.com/gin-gonic/gin"
)

func CategoryRoutes(incomingRoutes *gin.Engine){
	
	incomingRoutes.GET("/category", handler.GetCategories())
	incomingRoutes.GET("/category/:id", handler.GetCategoryById())
	incomingRoutes.POST("/category/create",middleware.Authenticate(),handler.CreateCategory())
	incomingRoutes.PUT("/category/:id",middleware.Authenticate(),handler.UpdateCategory())
	incomingRoutes.DELETE("/category/:id",middleware.Authenticate(),handler.DeleteCategory())
	incomingRoutes.GET("/category/search", handler.SearchCategory())
    // incomingRoutes.POST("/categories/create-categories", handler.CreateCategories())
}