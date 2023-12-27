package controller

import (
	"fmt"
	"log"
	"context"
	"net/http"
	"time"
    "expendit-server/models"
	"expendit-server/database"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var  incomeCollection *mongo.Collection = database.OpenCollection(database.Client, "income")

func GetIncomeById()gin.HandlerFunc {
	return func(c *gin.Context){
	id := c.Param("id")

    objectID, err := primitive.ObjectIDFromHex(id)

	if err != nil{
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid ID"})

		return
	}
	var income models.Income
	err = incomeCollection.FindOne(context.Background(), bson.M{"_id":objectID}).Decode(&income)
      if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error":"Expense not found"})
		 return 
	  }
	  c.JSON(http.StatusOK, income)
	}   
}    


func GetIncomes()gin.HandlerFunc{
	return func(c *gin.Context){
	cursor, err  := incomeCollection.Find(context.Background(), bson.M{})
    if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
         return 
	}
	defer cursor.Close(context.Background())

	var income []models.Income

	if err := cursor.All(context.Background(), &income); err != nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})

		return 
	}

	c.JSON(http.StatusOK, income)
}
}


func CreateIncome() gin.HandlerFunc {
	return func(c *gin.Context) {
		var income models.Income

		if err := c.ShouldBindJSON(&income); err != nil {
			fmt.Printf("Error during JSON binding: %s\n", err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to bind JSON data", "details": err.Error()})
			return
		}

		uid, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		income.UserID = uid.(string)
		income.ID = primitive.NewObjectID()
		income.CreatedAt = time.Now()
		income.UpdatedAt = time.Now()

		_, err := incomeCollection.InsertOne(context.Background(), income)
		if err != nil {
			log.Println("Error inserting income document:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		c.JSON(http.StatusCreated, income)
	}
}


func UpdateIncome()gin.HandlerFunc{
	return  func(c *gin.Context){
	id := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid ID"})
		return 
	} 

	var  updatedIncome models.Income
	if err := c.ShouldBindJSON(&updatedIncome); err != nil{
		c.JSON(http.StatusBadRequest, gin.H{"error":err.Error()})
		return 
	}

	updatedIncome.UpdatedAt = time.Now()
    update := bson.D{
		{Key:"$set", Value:bson.D{
			{Key:"amount", Value:updatedIncome.Amount},
             {Key:"source", Value:updatedIncome.Source},
			 {Key:"description", Value:updatedIncome.Description},
		}},

	}
	result, err := incomeCollection.UpdateOne(
		   context.Background(),
		   bson.M{"_id":objectID},
		    update,
	)
      
	if err != nil{
	c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
	    return 
	}
	if result.ModifiedCount == 0  {
		c.JSON(http.StatusNotFound, gin.H{"error":"Income not found"})
		return 
	}

	c.JSON(http.StatusOK, updatedIncome)
}
}


func DeleteIncome()gin.HandlerFunc{
	return func(c *gin.Context){
	id  := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid"})
		return 
	}

	result , err := incomeCollection.DeleteOne(context.Background(), bson.M{"_id":objectID})
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

func SearchIncome() gin.HandlerFunc {
	return func(c *gin.Context) {
		cursor, err := incomeCollection.Find(context.Background(), bson.M{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		defer cursor.Close(context.Background())

		var income []models.Income
		if err := cursor.All(context.Background(), &income); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		c.JSON(http.StatusOK, income)
	}
}

func GetMonthlyIncome() gin.HandlerFunc {
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

		cursor, err := incomeCollection.Find(context.Background(), filter)
		if err != nil {
			log.Println("Error in MongoDB query:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var totalIncome float64

		for cursor.Next(context.Background()) {
			var income bson.M
			if err := cursor.Decode(&income); err != nil {
				log.Println("Error decoding MongoDB document:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
				return
			}

			amount, ok := income["amount"].(float64)
			if !ok {
				log.Println("Error retrieving 'amount' field from document")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
				return
			}

			totalIncome += amount
		}

		if err := cursor.Err(); err != nil {
			log.Println("Error in MongoDB cursor:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"totalIncome": totalIncome})
	}
}


// func GetMonthIncome() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		userID := c.Param("userID")

// 		// MongoDB aggregation pipeline for total income per month
// 		pipeline := []bson.M{
// 			{
// 				"$match": bson.M{
// 					"userid": userID,
// 					"createdat": bson.M{
// 						"$gte": time.Now().AddDate(0, 0, -30), // Assuming a month is approximately 30 days
// 					},
// 				},
// 			},
// 			{
// 				"$group": bson.M{
// 					"_id": bson.M{
// 						"month": bson.M{"$month": "$createdat"},
// 					},
// 					"totalIncome": bson.M{"$sum": "$amount"},
// 				},
// 			},
// 			{
// 				"$project": bson.M{
// 					"_id":         0,
// 					"month":       "$_id.month",
// 					"totalIncome": 1,
// 				},
// 			},
// 		}

// 		cursor, err := incomeCollection.Aggregate(context.Background(), pipeline)
// 		if err != nil {
// 			log.Println("Error in MongoDB aggregation:", err)
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
// 			return
// 		}
// 		defer cursor.Close(context.Background())

// 		var result []bson.M
// 		if err := cursor.All(context.Background(), &result); err != nil {
// 			log.Println("Error decoding MongoDB documents:", err)
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
// 			return
// 		}

// 		c.JSON(http.StatusOK, result)
// 	}
// }

func GetMonthIncome() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userID")

		// MongoDB aggregation pipeline for total income per month
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
					"totalIncome": bson.M{"$sum": "$amount"},
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
					"totalIncome": 1,
				},
			},
		}

		cursor, err := incomeCollection.Aggregate(context.Background(), pipeline)
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