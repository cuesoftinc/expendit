package controller

import (
	"context"
	"expendit-server/database"
	"expendit-server/models"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var  expenseCollection *mongo.Collection = database.OpenCollection(database.Client, "expense")
var CategoryCollection *mongo.Collection = database.OpenCollection(database.Client, "category")

func GetExpenseById()gin.HandlerFunc {
	return func(c *gin.Context){
	id := c.Param("id")

    objectID, err := primitive.ObjectIDFromHex(id)

	if err != nil{
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid ID"})

		return
	}
	var expense models.Expense
	err = expenseCollection.FindOne(context.Background(), bson.M{"_id":objectID}).Decode(&expense)
      if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error":"Expense not found"})
		 return 
	  }
	  c.JSON(http.StatusOK, expense)
	}   
}    


func GetExpenses() gin.HandlerFunc {
	return func(c *gin.Context) {

    page, err := strconv.Atoi(c.Query("page"))
		if err != nil || page <= 0 {
			page  = 1
		}
		perPage, err := strconv.Atoi(c.Query("per_page"))
		if err != nil || perPage <= 0 {
			perPage = 10 
		}

		skip := (page - 1) * perPage

		cursor, err := expenseCollection.Find(context.Background(), bson.M{}, options.Find().SetSkip(int64(skip)).SetLimit(int64(perPage)))
		if err != nil {
			log.Println("Error querying expenses:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var expenses []models.Expense

		if err := cursor.All(context.Background(), &expenses); err != nil {
        log.Println("Error querying expenses:", err)
       c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "details": err.Error()})
       return
}

		c.JSON(http.StatusOK, expenses)
	}
};

// func GetUserExpense() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		userID := c.Param("userID")

// 		page, err := strconv.Atoi(c.Query("page"))
// 		if err != nil || page <= 0 {
// 			page = 1
// 		}
// 		perPage, err := strconv.Atoi(c.Query("per_page"))
// 		if err != nil || perPage <= 0 {
// 			perPage = 10
// 		}

// 		skip := (page - 1) * perPage

// 		filter := bson.D{{Key: "userid", Value: userID}}

// 		cursor, err := expenseCollection.Find(
// 			context.Background(),
// 			filter,
// 			options.Find().SetSkip(int64(skip)).SetLimit(int64(perPage)),
// 		)
// 		if err != nil {
// 			log.Println("Error in MongoDB query:", err)
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
// 			return
// 		}
// 		defer cursor.Close(context.Background())

// 		var results []models.Expense

// 		for cursor.Next(context.Background()) {
// 			var expense models.Expense
// 			if err := cursor.Decode(&expense); err != nil {
// 				log.Println("Error decoding MongoDB document:", err)
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
// 				return
// 			}
// 			results = append(results, expense)

// 		}

// 		if err := cursor.Err(); err != nil {
// 			log.Println("Error in MongoDB cursor:", err)
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
// 			return
// 		}

// 		if len(results) == 0 {
// 			log.Println("No expense records found.")
// 		}

// 		c.JSON(http.StatusOK, gin.H{"results": results})
// 	}
// }

func GetMonthlyExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		now := time.Now()
		currentMonth := now.Month()
		currentYear := now.Year()

		filter := bson.D{
			{Key: "userid", Value: userID},
			{Key: "createdat", Value: bson.D{
				{Key: "$gte", Value: time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC)},
				{Key: "$lt", Value: time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC)},
			}},
		}

		cursor, err := expenseCollection.Find(context.Background(), filter)
		if err != nil {
			log.Println("Error in MongoDB query:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var totalExpense float64

		for cursor.Next(context.Background()) {
			var expense bson.M
			if err := cursor.Decode(&expense); err != nil {
				log.Println("Error decoding MongoDB document:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
				return
			}

			amount, ok := expense["amount"].(float64)
			if !ok {
				log.Println("Error retrieving 'amount' field from document")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
				return
			}

			totalExpense += amount
		}

		if err := cursor.Err(); err != nil {
			log.Println("Error in MongoDB cursor:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"totalExpense": totalExpense})
	}
}


func CreateExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		var expense models.Expense

		if err := c.ShouldBindJSON(&expense); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		uid, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		expense.UserID = uid.(string)
		expense.ID = primitive.NewObjectID()
		expense.CreatedAt = time.Now()
		expense.UpdatedAt = time.Now()

		_, err := expenseCollection.InsertOne(context.Background(), expense)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		c.JSON(http.StatusCreated, expense)
	}
}



func UpdateExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var updatedExpense models.Expense
		if err := c.ShouldBindJSON(&updatedExpense); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		updatedExpense.UpdatedAt = time.Now()
         update := bson.D{
			{
				Key:"$set", Value: bson.D{
					{Key:"amount", Value:updatedExpense.Amount},
					{Key:"category",Value:updatedExpense.Category},
		            {Key:"note",Value:updatedExpense.Note},		
				}},
		 }
		result, err := expenseCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": objectID},
			update,
			
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		if result.ModifiedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
			return
		}

		c.JSON(http.StatusOK, updatedExpense)
	}
}


func DeleteExpense()gin.HandlerFunc{
	return func(c *gin.Context){
	id  := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid"})
		return 
	}

	result , err := expenseCollection.DeleteOne(context.Background(), bson.M{"_id":objectID})
	if err != nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
		return 
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error":"Expense not found "})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
}

func SearchExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("query")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
			return
		}

		filter := bson.M{"items": bson.M{"$regex": primitive.Regex{Pattern: query, Options: "i"}}}
		cursor, err := expenseCollection.Find(context.Background(), filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var expenseSearch []models.Expense
		if err := cursor.All(context.Background(), &expenseSearch); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		if len(expenseSearch) == 0 {
			c.JSON(http.StatusOK, gin.H{"message": "No matching expenses found"})
			return
		}

		c.JSON(http.StatusOK, expenseSearch)
	}
}




func GetMonthExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		
		pipeline := []bson.M{
			{
				"$match": bson.M{
					"userid": userID,
					"createdat": bson.M{
						"$gte": time.Now().AddDate(0, 0, -30), // Assuming a month is approximately 30 days
					},
				},
			},
			{
				"$group": bson.M{
					"_id": bson.M{
						"month": bson.M{"$month": "$createdat"},
					},
					"expense": bson.M{"$sum": "$amount"},
				},
			},
			{
				"$project": bson.M{
					"_id":         0,
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
					"expense": 1,
				},
			},
		}

		cursor, err := expenseCollection.Aggregate(context.Background(), pipeline)
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





func GetUserExpense() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		page, err := strconv.Atoi(c.Query("page"))
		if err != nil || page <= 0 {
			page = 1
		}
		perPage, err := strconv.Atoi(c.Query("per_page"))
		if err != nil || perPage <= 0 {
			perPage = 10
		}

		skip := (page - 1) * perPage

		filter := bson.D{{Key: "userid", Value: userID}}

		cursor, err := expenseCollection.Find(
			context.Background(),
			filter,
			options.Find().SetSkip(int64(skip)).SetLimit(int64(perPage)),
		)
		if err != nil {
			log.Println("Error in MongoDB query:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var results []models.Expense

		for cursor.Next(context.Background()) {
			var expense models.Expense
			if err := cursor.Decode(&expense); err != nil {
				log.Println("Error decoding MongoDB document:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
				return
			}
			results = append(results, expense)
		}

		if err := cursor.Err(); err != nil {
			log.Println("Error in MongoDB cursor:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		if len(results) == 0 {
			log.Println("No expense records found.")
		}

		// Calculate total number of pages
		totalExpenses, err := expenseCollection.CountDocuments(context.Background(), filter)
		if err != nil {
			log.Println("Error getting total number of expenses:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		totalPages := int(math.Ceil(float64(totalExpenses) / float64(perPage)))

		// Create response without "total_expenses"
		response := gin.H{
			"results":     results,
			"page":        page,
			"total_pages": totalPages,
		}

		c.JSON(http.StatusOK, response)
	}
}