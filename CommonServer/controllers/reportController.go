package controller

import (
	"context"
	"expendit-server/database"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var incomesCollection *mongo.Collection = database.OpenCollection(database.Client, "income")
var expensesCollection *mongo.Collection = database.OpenCollection(database.Client, "expense")

func GetMonthlyReport() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")
	 incomePipeline := []bson.M{
		{
			"$match": bson.M{
				"userid": userID,
				"createdat": bson.M{
					"$gte": time.Now().AddDate(0, 0, -30),
				},
			},
		},
		{
			"$group": bson.M{
				"_id":         bson.M{
					"month":bson.M{"$month": "$createdat"},
				},
				"totalIncome": bson.M{"$sum": "$amount"},
			},
		},
		{
			"$project": bson.M{
				"_id":         0,
				"month":       bson.M{"$switch": bson.M{
					"branches": []bson.M{
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 1}}, "then": "January"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 2}}, "then": "February"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 3}}, "then": "March"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 4}}, "then": "April"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 5}}, "then": "May"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 6}}, "then": "June"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 7}}, "then": "July"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 8}}, "then": "August"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 9}}, "then": "September"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 10}}, "then": "October"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 11}}, "then": "November"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 12}}, "then": "December"},
					},
					"default": "Unknown",
				},},
				"totalIncome": 1,
			},
		},
		}

	incomeCursor, err := incomesCollection.Aggregate(context.Background(), incomePipeline)
	if err != nil {
		log.Println("Error in MongoDB aggregation for income:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
		return
	}
	defer incomeCursor.Close(context.Background())

	// MongoDB aggregation pipeline for total expenses per month
	expensePipeline := []bson.M{
		{
			"$match": bson.M{
				"userid": userID,
				"createdat": bson.M{
					"$gte": time.Now().AddDate(0, 0, -30),
				},
			},
		},
		{
			"$group": bson.M{
				"_id":  bson.M{
					"month": bson.M{"$month": "$createdat"},
				},
				"totalExpense": bson.M{"$sum": "$amount"},
			},
		},
		{
			"$project": bson.M{
				"_id":           0,
				"month":         bson.M{"$switch": bson.M{
					"branches": []bson.M{
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 1}}, "then": "January"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 2}}, "then": "February"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 3}}, "then": "March"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 4}}, "then": "April"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 5}}, "then": "May"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 6}}, "then": "June"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 7}}, "then": "July"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 8}}, "then": "August"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 9}}, "then": "September"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 10}}, "then": "October"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 11}}, "then": "November"},
						{"case": bson.M{"$eq": []interface{}{"$_id.month", 12}}, "then": "December"},
					},
					"default": "Unknown",
				},},
				"totalExpense":  1,
			},
		},
	}

	expenseCursor, err := expensesCollection.Aggregate(context.Background(), expensePipeline)
	if err != nil {
		log.Println("Error in MongoDB aggregation for expenses:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
		return
	}
	defer expenseCursor.Close(context.Background())

	// Fetch and combine the results
	var result struct {
		TotalIncome  []bson.M `json:"totalIncome"`
		TotalExpense []bson.M `json:"totalExpense"`
	}

	if err := incomeCursor.All(context.Background(), &result.TotalIncome); err != nil {
		log.Println("Error decoding MongoDB documents for income:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
		return
	}

	if err := expenseCursor.All(context.Background(), &result.TotalExpense); err != nil {
		log.Println("Error decoding MongoDB documents for expenses:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
}
