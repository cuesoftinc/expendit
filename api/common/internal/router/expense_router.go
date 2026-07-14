package router

import (
	"expendit-server/internal/handler"
	"expendit-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func ExpenseRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.GET("/expense", middleware.Authenticate(), handler.GetExpenses())
	incomingRoutes.GET("/expense/:id", handler.GetExpenseById())
	incomingRoutes.GET("/expense/user/:userID", middleware.Authenticate(), handler.GetUserExpense())
	incomingRoutes.POST("/expense/create", middleware.Authenticate(), handler.CreateExpense())
	incomingRoutes.PUT("/expense/:id", middleware.Authenticate(), handler.UpdateExpense())
	incomingRoutes.DELETE("/expense/:id", middleware.Authenticate(), handler.DeleteExpense())
	incomingRoutes.GET("/expense/search", handler.SearchExpense())
	incomingRoutes.GET("/expense/expenses/month/:userID", middleware.Authenticate(), handler.GetMonthlyExpense())
	incomingRoutes.GET("/expense/month-expense/:userID", middleware.Authenticate(), handler.GetMonthExpense())
}
