package router

import (
	"github.com/cuesoftinc/expendit/api/common/internal/handler"
	middleware "github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/gin-gonic/gin"
)

func ReportRoutes(incomingRoutes *gin.Engine) {
	// Scoped group: auth applies to /report/* only (a bare engine.Use here
	// would leak auth onto every route registered after this function).
	report := incomingRoutes.Group("/report", middleware.Authenticate())
	report.GET("/monthly/:userID", handler.BarChartReport())
	report.GET("/chart/category/:userID", handler.ReportByCategory())
	report.GET("/chart/category/expenses/:userID", handler.ReportByCategoryExpenses())
}
