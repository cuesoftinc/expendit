package routes



import (
	"expendit-server/controller"
	"github.com/gin-gonic/gin"
)

func IncomeRoutes(incomingRoutes *gin.Engine){
	
	incomingRoutes.GET("/income", controller.GetIncomes())
	incomingRoutes.GET("/income/:id", controller.GetIncomeById())
	incomingRoutes.POST("/income/create",controller.CreateIncome())
	incomingRoutes.PUT("/income/:id",controller.UpdateIncome())
	incomingRoutes.DELETE("/income/:id",controller.DeleteIncome())
	incomingRoutes.GET("/income/search", controller.SearchIncome())
}