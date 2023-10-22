package main

import (
	"expendit-server/configs"
	pb "expendit-server/proto"
	"expendit-server/services"
	"expendit-server/utils"
	"google.golang.org/grpc"
	"log"
	"net"
	"sync"
)

var wg sync.WaitGroup


func main() {
	// Load environment variables
	config.LoadEnv()

	lis, err := net.Listen("tcp", "[::1]:8080")
	if err != nil {
		log.Fatalln("App: Failed to start server:", err)
	}
	log.Println("Server listening on port 8080")

	// Create gRPC server
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(utils.AuthenticateInterceptor),
	)
	service := &services.UserServiceServer{}

	// Register the service with the server
	pb.RegisterUserServiceServer(grpcServer, service)

	wg.Add(1)
	go func() {
		defer wg.Done() // Mark this goroutine as done when it finishes
		err := grpcServer.Serve(lis)
		if err != nil {
			log.Fatalln("gRPC: Failed to start server:", err)
		}
	}()

	log.Println("gRPC server started")

	// Wait for both servers to start before exiting
	wg.Wait()
}