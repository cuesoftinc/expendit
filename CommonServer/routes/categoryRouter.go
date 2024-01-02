package routes



import (
	"expendit-server/controllers"
	"github.com/gin-gonic/gin"
)

func CategoryRoutes(incomingRoutes *gin.Engine){
	
	incomingRoutes.GET("/category", controller.GetCategories())
	incomingRoutes.GET("/category/:id", controller.GetCategoryById())
	incomingRoutes.POST("/category/create",controller.CreateCategory())
	incomingRoutes.PUT("/category/:id",controller.UpdateCategory())
	incomingRoutes.DELETE("/category/:id",controller.DeleteCategory())
	incomingRoutes.GET("/category/search", controller.SearchCategory())
    // incomingRoutes.POST("/categories/create-categories", controller.CreateCategories())
}