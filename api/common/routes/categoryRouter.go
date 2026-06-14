package routes



import (
	"expendit-server/controllers"
	"expendit-server/middleware"
	"github.com/gin-gonic/gin"
)

func CategoryRoutes(incomingRoutes *gin.Engine){
	
	incomingRoutes.GET("/category", controller.GetCategories())
	incomingRoutes.GET("/category/:id", controller.GetCategoryById())
	incomingRoutes.POST("/category/create",middleware.Authenticate(),controller.CreateCategory())
	incomingRoutes.PUT("/category/:id",middleware.Authenticate(),controller.UpdateCategory())
	incomingRoutes.DELETE("/category/:id",middleware.Authenticate(),controller.DeleteCategory())
	incomingRoutes.GET("/category/search", controller.SearchCategory())
    // incomingRoutes.POST("/categories/create-categories", controller.CreateCategories())
}