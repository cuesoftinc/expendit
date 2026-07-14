package router



import (
	"expendit-server/internal/handler"
	middleware "expendit-server/internal/middleware"
	"github.com/gin-gonic/gin"
)

func IncomeRoutes(incomingRoutes *gin.Engine) {
	// Scoped group: auth applies to /income/* only (a bare engine.Use here
	// would leak auth onto every route registered after this function).
	income := incomingRoutes.Group("/income", middleware.Authenticate())
	income.GET("", handler.GetIncomes())
	income.GET("/:id", handler.GetIncomeById())
	income.POST("/create", handler.CreateIncome())
	income.PUT("/:id", handler.UpdateIncome())
	income.DELETE("/:id", handler.DeleteIncome())
	income.GET("/search", handler.SearchIncome())
	income.GET("/incomes/monthly/:userID", handler.GetMonthlyIncome())
	income.GET("/incomes/month/:userID", handler.GetMonthIncome())
}