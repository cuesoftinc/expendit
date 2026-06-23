package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"expendit-server/database"
	"expendit-server/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var aiExpenseCol *mongo.Collection = database.OpenCollection(database.Client, "expense")
var aiIncomeCol *mongo.Collection = database.OpenCollection(database.Client, "income")

func AISummary() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, _ := c.Get("uid")
		userID := uid.(string)

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		now := time.Now()
		threeMonthsAgo := now.AddDate(0, -3, 0)
		rangeStart := time.Date(threeMonthsAgo.Year(), threeMonthsAgo.Month(), 1, 0, 0, 0, 0, time.UTC)
		rangeEnd := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)

		// Aggregate expenses by category
		expPipeline := []bson.M{
			{"$match": bson.M{"userid": userID, "createdat": bson.M{"$gte": rangeStart, "$lt": rangeEnd}}},
			{"$group": bson.M{"_id": "$category", "total": bson.M{"$sum": "$amount"}, "count": bson.M{"$sum": 1}}},
			{"$sort": bson.M{"total": -1}},
		}
		expCursor, err := aiExpenseCol.Aggregate(ctx, expPipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer expCursor.Close(ctx)
		var expCategories []bson.M
		expCursor.All(ctx, &expCategories)

		// Aggregate income by source
		incPipeline := []bson.M{
			{"$match": bson.M{"userid": userID, "createdat": bson.M{"$gte": rangeStart, "$lt": rangeEnd}}},
			{"$group": bson.M{"_id": "$source", "total": bson.M{"$sum": "$amount"}, "count": bson.M{"$sum": 1}}},
			{"$sort": bson.M{"total": -1}},
		}
		incCursor, err := aiIncomeCol.Aggregate(ctx, incPipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer incCursor.Close(ctx)
		var incSources []bson.M
		incCursor.All(ctx, &incSources)

		// Totals
		var totalExpense, totalIncome float64
		for _, e := range expCategories {
			if v, ok := e["total"].(float64); ok {
				totalExpense += v
			}
		}
		for _, i := range incSources {
			if v, ok := i["total"].(float64); ok {
				totalIncome += v
			}
		}

		// Build stats summary to send to AI (compact, not raw transactions)
		expJSON, _ := json.Marshal(expCategories)
		incJSON, _ := json.Marshal(incSources)

		prompt := fmt.Sprintf(
			"You are a personal finance assistant for a Nigerian user.\n"+
				"Analyse the following financial data from the last 3 months and write a short, friendly summary (3-5 sentences).\n"+
				"Mention total inflows vs outflows, top spending categories, and one practical money tip.\n"+
				"Use ₦ for currency. Be conversational, not formal.\n\n"+
				"Total income: ₦%.2f\n"+
				"Total expenses: ₦%.2f\n"+
				"Net: ₦%.2f\n\n"+
				"Expense breakdown by category: %s\n"+
				"Income breakdown by source: %s\n\n"+
				"Write the summary as plain text (no markdown, no bullet points).",
			totalIncome, totalExpense, totalIncome-totalExpense,
			string(expJSON), string(incJSON),
		)

		ai := services.NewAIEnhancer()
		if ai == nil {
			// No AI key — return a basic rule-based summary
			summary := buildRuleSummary(totalIncome, totalExpense, expCategories)
			c.JSON(http.StatusOK, gin.H{"summary": summary, "ai": false})
			return
		}

		aiCtx, aiCancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer aiCancel()

		text, err := ai.GenerateText(aiCtx, prompt)
		if err != nil {
			summary := buildRuleSummary(totalIncome, totalExpense, expCategories)
			c.JSON(http.StatusOK, gin.H{"summary": summary, "ai": false})
			return
		}

		c.JSON(http.StatusOK, gin.H{"summary": strings.TrimSpace(text), "ai": true})
	}
}

func buildRuleSummary(totalIncome, totalExpense float64, categories []bson.M) string {
	net := totalIncome - totalExpense
	direction := "surplus"
	if net < 0 {
		direction = "deficit"
	}
	top := "N/A"
	if len(categories) > 0 {
		if v, ok := categories[0]["_id"].(string); ok {
			top = v
		}
	}
	return fmt.Sprintf(
		"Over the last 3 months you earned ₦%.2f and spent ₦%.2f, leaving a %s of ₦%.2f. Your top spending category was %s.",
		totalIncome, totalExpense, direction, abs(net), top,
	)
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}
