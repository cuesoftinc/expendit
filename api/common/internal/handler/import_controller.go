package handler

// The upload endpoint moved to api/intake (POST /receipts); it publishes to
// Kafka instead of calling into this package directly. This file now only
// keeps the CRUD-shaped handlers that read/mutate job state api/common owns.

import (
	"context"
	"net/http"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

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

		job, txns, err := service.GetImportJob(ctx, jobID, uid.(string))
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

		if err := service.ConfirmImport(ctx, jobID, uid.(string)); err != nil {
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

		if err := service.UpdateTransactionCategory(ctx, txnID, uid.(string), body.Category); err != nil {
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

		if err := service.DiscardImport(ctx, jobID, uid.(string)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}
