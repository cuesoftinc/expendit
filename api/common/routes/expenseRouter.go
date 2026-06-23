package routes

import (
	"expendit-server/controllers"
	"expendit-server/middleware"

	"github.com/gin-gonic/gin"
)

func ExpenseRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.GET("/expense", middleware.Authenticate(), controller.GetExpenses())
	incomingRoutes.GET("/expense/:id", controller.GetExpenseById())
	incomingRoutes.GET("/expense/user/:userID", middleware.Authenticate(), controller.GetUserExpense())
	incomingRoutes.POST("/expense/create", middleware.Authenticate(), controller.CreateExpense())
	incomingRoutes.PUT("/expense/:id", middleware.Authenticate(), controller.UpdateExpense())
	incomingRoutes.DELETE("/expense/:id", middleware.Authenticate(), controller.DeleteExpense())
	incomingRoutes.GET("/expense/search", controller.SearchExpense())
	incomingRoutes.GET("/expense/expenses/month/:userID", middleware.Authenticate(), controller.GetMonthlyExpense())
	incomingRoutes.GET("/expense/month-expense/:userID", middleware.Authenticate(), controller.GetMonthExpense())
}
