package router

import (
	"expendit-server/internal/handler"
	"expendit-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func ImportRoutes(incomingRoutes *gin.Engine) {
	incomingRoutes.POST("/import/upload", middleware.Authenticate(), handler.UploadImport())
	incomingRoutes.GET("/import/:jobId", middleware.Authenticate(), handler.GetImportJobHandler())
	incomingRoutes.POST("/import/:jobId/confirm", middleware.Authenticate(), handler.ConfirmImportHandler())
	incomingRoutes.PUT("/import/transaction/:id/category", middleware.Authenticate(), handler.UpdateImportTransactionCategory())
	incomingRoutes.DELETE("/import/:jobId", middleware.Authenticate(), handler.DiscardImportHandler())
}
