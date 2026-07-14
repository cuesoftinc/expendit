package router



import (
	"expendit-server/internal/handler"
	middleware "expendit-server/internal/middleware"
	"github.com/gin-gonic/gin"
)

func IncomeRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.Use(middleware.Authenticate())
	incomingRoutes.GET("/income", handler.GetIncomes())
	incomingRoutes.GET("/income/:id", handler.GetIncomeById())
	incomingRoutes.POST("/income/create",handler.CreateIncome())
	incomingRoutes.PUT("/income/:id",handler.UpdateIncome())
	incomingRoutes.DELETE("/income/:id",handler.DeleteIncome())
	incomingRoutes.GET("/income/search", handler.SearchIncome())
	incomingRoutes.GET("/income/incomes/monthly/:userID", handler.GetMonthlyIncome())
	incomingRoutes.GET("/income/incomes/month/:userID", handler.GetMonthIncome())
}