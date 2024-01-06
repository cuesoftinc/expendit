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

         now := time.Now()
		currentMonth := now.Month()
		currentYear := now.Year()
		// MongoDB aggregation pipeline for total income per month
		incomePipeline := []bson.M{
			{
				"$match": bson.M{
					"userid": userID,
					"createdat": bson.M{
						"$gte": time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC),
						"$lt":  time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC),
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
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 1}}, "then": "Jan"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 2}}, "then": "Feb"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 3}}, "then": "Mar"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 4}}, "then": "Apr"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 5}}, "then": "May"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 6}}, "then": "Jun"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 7}}, "then": "Jul"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 8}}, "then": "Aug"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 9}}, "then": "Sep"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 10}}, "then": "Oct"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 11}}, "then": "Nov"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 12}}, "then": "Dec"},
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
						"$gte": time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC),
						"$lt":  time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC),
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
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 1}}, "then": "Jan"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 2}}, "then": "Feb"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 3}}, "then": "Mar"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 4}}, "then": "Apr"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 5}}, "then": "May"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 6}}, "then": "Jun"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 7}}, "then": "Jul"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 8}}, "then": "Aug"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 9}}, "then": "Sep"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 10}}, "then": "Oct"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 11}}, "then": "Nov"},
							{"case": bson.M{"$eq": []interface{}{"$_id.month", 12}}, "then": "Dec"},
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
		if len(result) == 0 {
			result = append(result, bson.M{"totalexpense":0,"totalIncome":0, "month":currentMonth.String()[:3]})
		}
		c.JSON(http.StatusOK, result)
	}
}


func ReportByCategory() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.Param("userID")
             
		now := time.Now()
		currentMonth := now.Month()
		currentYear := now.Year()
        pipeline := []bson.M{
            {
                "$match": bson.M{
                    "userid": userID,
                    "createdat": bson.M{
                        "$gte": time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC),
						"$lt":  time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC),
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
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 1}}, "then": "Jan"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 2}}, "then": "Feb"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 3}}, "then": "Mar"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 4}}, "then": "Apr"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 5}}, "then": "May"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 6}}, "then": "Jun"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 7}}, "then": "Jul"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 8}}, "then": "Aug"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 9}}, "then": "Sep"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 10}}, "then": "Oct"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 11}}, "then": "Nov"},
                                {"case": bson.M{"$eq": []interface{}{"$_id.month", 12}}, "then": "Dec"},
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
           

		if len(result) == 0 {
			result = append(result, bson.M{"Category":0,"totalIncome":0, "month":currentMonth.String()[:3]})
		}
        c.JSON(http.StatusOK, result)
    }
}


func ReportByCategoryExpenses() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.Param("userID")
		now := time.Now()
		currentMonth := now.Month()
		currentYear := now.Year()
        pipeline := []bson.M{
            {
                "$match": bson.M{
                    "userid": userID,
                    "createdat": bson.M{
                        "$gte": time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC),
						"$lt":  time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC),
                    },
                },
            },
            {
                "$group": bson.M{
                    "_id": bson.M{
                       
                        "category": "$category",
                    },
                    "expense": bson.M{"$sum": "$amount"},
                },
            },
            {
                "$project": bson.M{
                    "_id": 0,
                    "category":      "$_id.category",
                    "expense":   1,
                },
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
		if len(result) == 0 {
			result = append(result, bson.M{"category":0,"expense":0})
		}
        c.JSON(http.StatusOK, result)
    }
}

