package routes



import (
	"expendit-server/controllers"
	"github.com/gin-gonic/gin"
)

func ExpenseRoutes(incomingRoutes *gin.Engine){
	
	incomingRoutes.GET("/expense", controller.GetExpenses())
	incomingRoutes.GET("/expense/:id", controller.GetExpenseById())
	incomingRoutes.GET("/expense/user/:userID", controller.GetUserExpense())
	incomingRoutes.POST("/expense/create",controller.CreateExpense())
	incomingRoutes.PUT("/expense/:id",controller.UpdateExpense())
	incomingRoutes.DELETE("/expense/:id",controller.DeleteExpense())
	incomingRoutes.GET("/expense/search", controller.SearchExpense())
	incomingRoutes.GET("/expense/expenses/month/:userID", controller.GetMonthlyExpense())
	incomingRoutes.GET("/expense/month-expense/:userID", controller.GetMonthExpense())
}