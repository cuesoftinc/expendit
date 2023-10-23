package services

import (
	"context"
	"expendit-server/configs"
	"expendit-server/models"
	pb "expendit-server/proto"
	"expendit-server/utils"
)

var db = config.NewDBHandler()

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
}

func (service *UserServiceServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	user, err := db.GetUser(req.Email)

	// Check if password is correct
	if !(utils.ComparePassword(user.Password, req.Password)) {
		return nil, err
	}

	if err != nil {
		return &pb.GetUserResponse{
			Id:     "",
			Name:   "",
			Email:  "",
			Token:  "",
			Status: "failed",
			Data:   "Credentials not found!",
		}, err
	}

	// Generate a token
	token, err := utils.GenerateToken(user.Email)

	if err != nil {
		return &pb.GetUserResponse{
			Id:     "",
			Name:   "",
			Email:  "",
			Token:  "",
			Status: "failed",
			Data:   "Token generation failed!",
		}, err
	}
	return &pb.GetUserResponse{
		Id:     user.Id.String(),
		Name:   user.Name,
		Email:  user.Email,
		Token:  token,
		Status: "success",
	}, nil
}

func (service *UserServiceServer) GetUsers(ctx context.Context, req *pb.Empty) (*pb.GetAllUsersResponse, error) {
	users, err := db.GetUsers()
	var allUsers []*pb.GetUserResponse

	if err != nil {
		return nil, err
	}

	for _, user := range users {
		allUsers = append(allUsers, &pb.GetUserResponse{
			Id:    user.Id.String(),
			Name:  user.Name,
			Email: user.Email,
		})
	}

	return &pb.GetAllUsersResponse{
		Users: allUsers,
	}, nil
}

func (service *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	// Hash password
	hashedPassword, _ := utils.HashPassword(&req.Password)
	newUser := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: hashedPassword,
	}

	_, err := db.CreateUser(newUser)
	if err != nil {
		return &pb.CreateUserResponse{
			Data:   "User creation failed!",
			Status: "failed",
		}, err
	}

	return &pb.CreateUserResponse{
		Data:   "User created successfully!",
		Status: "success",
	}, nil
}

func (service *UserServiceServer) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	}

	_, err := db.UpdateUser(req.Id, user)
	if err != nil {
		return &pb.UpdateUserResponse{
			Data:   "User update failed!",
			Status: "failed",
		}, err
	}

	return &pb.UpdateUserResponse{
		Data:   "User updated successfully!",
		Status: "success",
	}, nil
}

func (service *UserServiceServer) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	_, err := db.DeleteUser(req.Id)
	if err != nil {
		return &pb.DeleteUserResponse{
			Data:   "User deletion failed!",
			Status: "failed",
		}, err
	}

	return &pb.DeleteUserResponse{
		Data:   "User deleted successfully!",
		Status: "success",
	}, nil
}
