package routes

import (
	controller "expendit-server/controllers"
	"expendit-server/middleware"

	"github.com/gin-gonic/gin"
)

func ImportRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.POST("/import/upload", middleware.Authenticate(), controller.UploadImport())
	incomingRoutes.GET("/import/:jobId", middleware.Authenticate(), controller.GetImportJobHandler())
	incomingRoutes.POST("/import/:jobId/confirm", middleware.Authenticate(), controller.ConfirmImportHandler())
	incomingRoutes.PUT("/import/transaction/:id/category", middleware.Authenticate(), controller.UpdateImportTransactionCategory())
	incomingRoutes.DELETE("/import/:jobId", middleware.Authenticate(), controller.DiscardImportHandler())
}
