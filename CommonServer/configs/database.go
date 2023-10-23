package config

import (
	"context"
	"expendit-server/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"os"
	"time"
)

type dbHandler interface {
	GetUser(email string) (*models.User, error)
	GetUsers() ([]*models.User, error)
	CreateUser(user models.User) (*mongo.InsertOneResult, error)
	UpdateUser(id string, user models.User) (*mongo.UpdateResult, error)
	DeleteUser(id string) (*mongo.DeleteResult, error)
}

type DB struct {
	client *mongo.Client
}

func collectionHelper(db *DB) *mongo.Collection {
	// Get the collection name
	collectionName := "User"

	// Access the collection
	collection := db.client.Database(os.Getenv("MONGODB_URI")).Collection(collectionName)

	// Create index if it doesn't exist
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{"email", 1}},
		Options: options.Index().SetUnique(true),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Println("Failed to create index:", err)
	}

	return collection
}

func NewDBHandler() dbHandler {
	LoadEnv()
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("MONGODB_URI")))
	if err != nil {
		log.Fatalln(err)
	}

	// Ping the database to check if it's connected
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalln(err)
	}
	log.Println("Connected to MongoDB")

	return &DB{client: client}
}

func (db *DB) GetUser(email string) (*models.User, error) {
	collection := collectionHelper(db)
	var user models.User

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch user by email address
	filter := bson.M{"email": email}

	err := collection.FindOne(ctx, filter).Decode(&user)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (db *DB) GetUsers() ([]*models.User, error) {
	collection := collectionHelper(db)
	var users []*models.User
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}

	defer func(cursor *mongo.Cursor, ctx context.Context) {
		err := cursor.Close(ctx)
		if err != nil {
			log.Println(err)
		}
	}(cursor, ctx)

	for cursor.Next(ctx) {
		var user models.User
		err := cursor.Decode(&user)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, nil
}

func (db *DB) CreateUser(user models.User) (*mongo.InsertOneResult, error) {
	collection := collectionHelper(db)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	newUser := models.User{
		Name:     user.Name,
		Email:    user.Email,
		Password: user.Password,
	}
	result, err := collection.InsertOne(ctx, newUser)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (db *DB) UpdateUser(id string, user models.User) (*mongo.UpdateResult, error) {
	collection := collectionHelper(db)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	updatedUser := bson.M{
		"name":     user.Name,
		"email":    user.Email,
		"password": user.Password,
	}

	result, err := collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updatedUser})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (db *DB) DeleteUser(id string) (*mongo.DeleteResult, error) {
	collection := collectionHelper(db)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)

	result, err := collection.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return nil, err
	}

	return result, nil
}