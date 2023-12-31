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


func BarChartReport() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		// MongoDB aggregation pipeline for total income per month
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
					"_id":         bson.M{"month": bson.M{"$month": "$createdat"}},
					"totalIncome": bson.M{"$sum": "$amount"},
					"totalExpense": bson.M{"$sum": 0}, // Initialize totalExpense to 0 for income pipeline
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
					"totalIncome":   1,
					"totalExpense":  1,
				},
			},
		}

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
					"_id":         bson.M{"month": bson.M{"$month": "$createdat"}},
					"totalIncome": bson.M{"$sum": 0}, // Initialize totalIncome to 0 for expense pipeline
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
					"totalIncome":   1,
					"totalExpense":  1,
				},
			},
		}

		// Execute income aggregation pipeline
		incomeCursor, err := incomesCollection.Aggregate(context.Background(), incomePipeline)
		if err != nil {
			log.Println("Error in MongoDB aggregation for income:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
			return
		}
		defer incomeCursor.Close(context.Background())

		// Execute expense aggregation pipeline
		expenseCursor, err := expensesCollection.Aggregate(context.Background(), expensePipeline)
		if err != nil {
			log.Println("Error in MongoDB aggregation for expenses:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
			return
		}
		defer expenseCursor.Close(context.Background())

		// Merge results for each month
		var result []bson.M
		incomeMap := make(map[string]bson.M)

		// Iterate over income results and store in a map
		for incomeCursor.Next(context.Background()) {
			var incomeEntry bson.M
			if err := incomeCursor.Decode(&incomeEntry); err != nil {
				log.Println("Error decoding MongoDB documents for income:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
				return
			}
			month := incomeEntry["month"].(string)
			incomeMap[month] = incomeEntry
		}

		
		for expenseCursor.Next(context.Background()) {
			var expenseEntry bson.M
			if err := expenseCursor.Decode(&expenseEntry); err != nil {
				log.Println("Error decoding MongoDB documents for expenses:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
				return
			}
			month := expenseEntry["month"].(string)

			
			if incomeEntry, exists := incomeMap[month]; exists {
				incomeEntry["totalExpense"] = expenseEntry["totalExpense"]
				result = append(result, incomeEntry)
			} else {
				
				result = append(result, expenseEntry)
			}
		}

		c.JSON(http.StatusOK, result)
	}
}







func ReportByCategory() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.Param("userID")

        pipeline := []bson.M{
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
                    "_id": bson.M{
                        "month":    bson.M{"$month": "$createdat"},
                        "category": "$category",
                    },
                    "totalAmount": bson.M{"$sum": "$amount"},
                },
            },
            {
                "$project": bson.M{
                    "_id": 0,
                    "month": bson.M{
                        "$switch": bson.M{
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
                        },
                    },
                    "category":      "$_id.category",
                    "totalAmount":   1,
                },
            },
            {
                "$group": bson.M{
                    "_id": "$month",
                    "categories": bson.M{"$push": bson.M{"k": "$category", "v": "$totalAmount"}},
                },
            },
            {
                "$replaceRoot": bson.M{"newRoot": bson.M{"$mergeObjects": bson.A{
                    bson.M{"month": "$_id"},
                    bson.M{"$arrayToObject": "$categories"},
                }}},
            },
        }

        cursor, err := expensesCollection.Aggregate(context.Background(), pipeline)
        if err != nil {
            log.Println("Error in MongoDB aggregation:", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
            return
        }
        defer cursor.Close(context.Background())

        var result []bson.M
        if err := cursor.All(context.Background(), &result); err != nil {
            log.Println("Error decoding MongoDB documents:", err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
            return
        }

        c.JSON(http.StatusOK, result)
    }
}