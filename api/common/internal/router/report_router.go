package router

import (
	"expendit-server/internal/handler"
	middleware "expendit-server/internal/middleware"
	"github.com/gin-gonic/gin"
)


func ReportRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.Use(middleware.Authenticate())
	incomingRoutes.GET("/report/monthly/:userID", handler.BarChartReport())
	incomingRoutes.GET("/report/chart/category/:userID", handler.ReportByCategory())
	incomingRoutes.GET("/report/chart/category/expenses/:userID", handler.ReportByCategoryExpenses())
	
    
}