package controller 


import (
	"context"
	"net/http"
	"fmt"
	"time"
    "expendit-server/models"
	"expendit-server/database"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)


var  categoryCollection *mongo.Collection = database.OpenCollection(database.Client, "category")

func GetCategoryById()gin.HandlerFunc {
	return func(c *gin.Context){
	id := c.Param("id")

    objectID, err := primitive.ObjectIDFromHex(id)

	if err != nil{
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid ID"})

		return
	}
	var category  models.Category
	err = categoryCollection.FindOne(context.Background(), bson.M{"_id":objectID}).Decode(&category)
      if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error":"Expense not found"})
		 return 
	  }
	  c.JSON(http.StatusOK, category)
	}   
} 
var CATEGORIES = []string{"Food",
"Transport",
"Groceries",
"Utility",
"Data",
"School",
"Netflix",
"Gaming",}

func CreateCategories() error {
	count, err := categoryCollection.CountDocuments(context.Background(), bson.M{})
	if err != nil {
		return err
	}

	if count > 0 {
		fmt.Println("Categories already exist.")
		return nil
	}

	var defaultCategories []interface{}
	for _, category := range CATEGORIES {
		defaultCategories = append(defaultCategories, bson.M{"name": category})
	}

	_, err = categoryCollection.InsertMany(context.Background(), defaultCategories)
	return err
}


func getCategoryByName(ctx context.Context, categoryName string) (models.Category, error) {
	var category models.Category

	err := categoryCollection.FindOne(ctx, bson.M{"name": categoryName}).Decode(&category)
	if err != nil {
		return models.Category{}, err
	}

	return category, nil
}


func GetCategories()gin.HandlerFunc{
	return func(c *gin.Context){
	cursor, err  := categoryCollection.Find(context.Background(), bson.M{})
    if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
         return 
	}
	defer cursor.Close(context.Background())

	var categories []models.Category

	if err := cursor.All(context.Background(), &categories); err != nil{
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})

		return 
	}

	c.JSON(http.StatusOK,categories)
}
}


func CreateCategory()gin.HandlerFunc{
	return func(c *gin.Context){
	var category models.Category

	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":err.Error()})
		return 
	}

   
    category.ID = primitive.NewObjectID()
	category.CreatedAt = time.Now()
	category.UpdatedAt = time.Now()


	_, err := categoryCollection.InsertOne(context.Background(), category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
		  return 
	}
	c.JSON(http.StatusCreated,category)
}
}




	
	
func UpdateCategory() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var updatedCategory models.Category
		if err := c.ShouldBindJSON(&updatedCategory); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Exclude the '_id' field from the update
		updatedCategory.UpdatedAt = time.Now()
		update := bson.D{
			{Key: "$set", Value: bson.D{
				{Key: "name", Value: updatedCategory.Name},
				// Add other fields as needed
			}},
		}

		result, err := categoryCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": objectID},
			update,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if result.ModifiedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
			return
		}

		c.JSON(http.StatusOK, updatedCategory)
	}
}




func DeleteCategory()gin.HandlerFunc{
	return func(c *gin.Context){
	id  := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid"})
		return 
	}

	result , err := categoryCollection.DeleteOne(context.Background(), bson.M{"_id":objectID})
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


func SearchCategory() gin.HandlerFunc {
	return func(c *gin.Context){
	query := c.Query("query")
	if query == ""{
		c.JSON(http.StatusBadRequest, gin.H{"error":"Search query is required"})
		return 
	}

	filter := bson.M{"items":bson.M{"$regex":primitive.Regex{Pattern:query,Options:"i"}}}
    cursor, err := categoryCollection.Find(context.Background(), filter)
     if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
	    return 
	}

	defer cursor.Close(context.Background())

        var category []models.Category
		if err := cursor.All(context.Background(), &category); err != nil{
			   c.JSON(http.StatusInternalServerError, gin.H{"error":"Internal Server Error"})
		       return 
			}
			c.JSON(http.StatusOK, category)
}
}

