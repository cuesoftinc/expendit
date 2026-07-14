package router

import (
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"

	"github.com/gin-gonic/gin"
)

func ExpenseRoutes(incomingRoutes *gin.Engine) {
	// Scoped group: every expense route requires auth (GetExpenseById and
	// SearchExpense were previously unauthenticated by omission).
	expense := incomingRoutes.Group("/expense", middleware.Authenticate())
	expense.GET("", handler.GetExpenses())
	expense.GET("/search", handler.SearchExpense())
	expense.GET("/:id", handler.GetExpenseById())
	expense.GET("/user/:userID", handler.GetUserExpense())
	expense.POST("/create", handler.CreateExpense())
	expense.PUT("/:id", handler.UpdateExpense())
	expense.DELETE("/:id", handler.DeleteExpense())
	expense.GET("/expenses/month/:userID", handler.GetMonthlyExpense())
	expense.GET("/month-expense/:userID", handler.GetMonthExpense())
}
