package services

import (
	"context"
	"testing"

	pb "expendit-server/proto"
	"github.com/stretchr/testify/assert"
)

func TestUserServiceServer_CreateUser(t *testing.T) {
	// Create a new instance of the UserServiceServer
	server := UserServiceServer{}

	// Create a context and a CreateUserRequest
	ctx := context.Background()
	req := &pb.CreateUserRequest{
		Name:     "Yusuf Aniki",
		Email:    "yusufaniki@example.com",
		Password: "password",
	}

	// Call the CreateUser method and get the response
	res, err := server.CreateUser(ctx, req)

	// Assert that there is no error and the response is not nil
	assert.NoError(t, err)
	assert.NotNil(t, res)

	// Assert that the response contains the expected values
	assert.Equal(t, "User created successfully!", res.Data)
	assert.Equal(t, "success", res.Status)
}

func TestUserServiceServer_GetUser(t *testing.T) {
	// Create a new instance of the UserServiceServer
	server := UserServiceServer{}

	// Create a context and a GetUserRequest
	ctx := context.Background()
	req := &pb.GetUserRequest{
		Email:    "yusufaniki@example.com",
		Password: "password",
	}

	// Call the GetUser method and get the response
	res, err := server.GetUser(ctx, req)

	// Assert that there is no error and the response is not nil
	assert.NoError(t, err)
	assert.NotNil(t, res)

	// Assert that the response contains the expected values
	assert.Equal(t, "yusufaniki@example.com", res.Email)
	assert.Equal(t, "success", res.Status)
}

func TestUserServiceServer_GetUsers(t *testing.T) {
	// Create a new instance of the UserServiceServer
	server := UserServiceServer{}

	// Create a context and an empty request
	ctx := context.Background()
	req := &pb.Empty{}

	// Call the GetUsers method and get the response
	res, err := server.GetUsers(ctx, req)

	// Assert that there is no error and the response is not nil
	assert.NoError(t, err)
	assert.NotNil(t, res)

	// Assert that the response contains the expected values
	assert.NotEmpty(t, res.Users)
}

func TestUserServiceServer_UpdateUser(t *testing.T) {
	// Create a new instance of the UserServiceServer
	server := UserServiceServer{}

	// Create a context and an UpdateUserRequest
	ctx := context.Background()
	req := &pb.UpdateUserRequest{
		Id:       "123",
		Name:     "Yusuf Aniki",
		Email:    "yusufaniki@example.com",
		Password: "newpassword",
	}

	// Call the UpdateUser method and get the response
	res, err := server.UpdateUser(ctx, req)

	// Assert that there is no error and the response is not nil
	assert.NoError(t, err)
	assert.NotNil(t, res)

	// Assert that the response contains the expected values
	assert.Equal(t, "User updated successfully!", res.Data)
	assert.Equal(t, "success", res.Status)
}