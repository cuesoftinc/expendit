package routes



import (
	"expendit-server/controller"
	middleware "expendit-server/middleware"
	"github.com/gin-gonic/gin"
)

func IncomeRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.Use(middleware.Authenticate())
	incomingRoutes.GET("/income", controller.GetIncomes())
	incomingRoutes.GET("/income/:id", controller.GetIncomeById())
	incomingRoutes.POST("/income/create",controller.CreateIncome())
	incomingRoutes.PUT("/income/:id",controller.UpdateIncome())
	incomingRoutes.DELETE("/income/:id",controller.DeleteIncome())
	incomingRoutes.GET("/income/search", controller.SearchIncome())
	incomingRoutes.GET("/income/incomes/month", controller.GetMonthlyIncome())
}