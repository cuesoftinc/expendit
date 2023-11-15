package routes



import (
	"expendit-server/controller"
	"github.com/gin-gonic/gin"
)

func ExpenseRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.GET("/expense", controller.GetExpense())
	incomingRoutes.POST("/expense/create_expense",controller.CreateExpense())
	incomingRoutes.PUT("/expense/:id",controller.UpdateExpense())
	incomingRoutes.DELETE("/expense/:id",controller.DeleteExpense())
	incomingRoutes.GET("/expense/:id", controller.ListExpense())
	incomingRoutes.GET("/expense/:id", controller.GetExpenses())

}