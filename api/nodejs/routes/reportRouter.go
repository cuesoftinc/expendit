package routes

import (
	"expendit-server/controllers"
	middleware "expendit-server/middleware"
	"github.com/gin-gonic/gin"
)


func ReportRoutes(incomingRoutes *gin.Engine){
	incomingRoutes.Use(middleware.Authenticate())
	incomingRoutes.GET("/report/monthly/:userID", controller.BarChartReport())
	incomingRoutes.GET("/report/chart/category/:userID", controller.ReportByCategory())
	incomingRoutes.GET("/report/chart/category/expenses/:userID", controller.ReportByCategoryExpenses())
	
    
}