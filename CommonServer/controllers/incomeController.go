package controller

import (
	"fmt"
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
		c.JSON(http.StatusNotFound, gin.H{"error":"Expense not found"})
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

		pipeline := bson.A{
			bson.D{
				{Key: "$match", Value: bson.D{
					{Key: "userID", Value: userID},
					{Key: "createdAt", Value: bson.D{
						{Key: "$gte", Value: time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, time.UTC)},
						{Key: "$lt", Value: time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, time.UTC)},
					}},
				}},
			},
			bson.D{
				{Key: "$group", Value: bson.D{
					{Key: "_id", Value: nil},
					{Key: "totalIncome", Value: bson.D{
						{Key: "$sum", Value: "$amount"},
					}},
				}},
			},
		}

		cursor, err := incomeCollection.Aggregate(context.Background(), pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}
		defer cursor.Close(context.Background())

		var result []bson.M
		if err := cursor.All(context.Background(), &result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}
