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

	result, err := expenseCollection.UpdateOne(
		   context.Background(),
		   bson.M{"id":objectID},
		   bson.D{{Key: "$set", Value: updatedIncome}},
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
