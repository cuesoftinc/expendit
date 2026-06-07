package controller

import (
	"context"
	"io"
	"net/http"
	"time"

	"expendit-server/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const maxImportFileSize = 10 << 20 // 10 MB

func UploadImport() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "a file field named 'file' is required"})
			return
		}
		defer file.Close()

		if header.Size > maxImportFileSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds 10 MB limit"})
			return
		}

		data, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
		defer cancel()

		result, err := services.ProcessImport(ctx, uid.(string), header.Filename, data)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

func GetImportJobHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := c.Get("uid")
		jobID, err := primitive.ObjectIDFromHex(c.Param("jobId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		job, txns, err := services.GetImportJob(ctx, jobID, uid.(string))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "import job not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"job": job, "transactions": txns})
	}
}

func ConfirmImportHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := c.Get("uid")
		jobID, err := primitive.ObjectIDFromHex(c.Param("jobId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
		defer cancel()

		if err := services.ConfirmImport(ctx, jobID, uid.(string)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "import confirmed — transactions saved"})
	}
}

func UpdateImportTransactionCategory() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := c.Get("uid")
		txnID, err := primitive.ObjectIDFromHex(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
			return
		}

		var body struct {
			Category string `json:"category" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := services.UpdateTransactionCategory(ctx, txnID, uid.(string), body.Category); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "category updated"})
	}
}

func DiscardImportHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := c.Get("uid")
		jobID, err := primitive.ObjectIDFromHex(c.Param("jobId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := services.DiscardImport(ctx, jobID, uid.(string)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}
