# Use an official Golang runtime as a base image 
FROM golang:1.21.1-alpine As builder

#Set the working directory inside the container
WORKDIR /app

# Copy the go.mod and go.sum files to the workspace
COPY go.mod go.sum ./

# Download and install dependencies
RUN go mod download

# Copy the entire project into the container
COPY . .

# Build the Go application 
RUN go build -o myapp

# Start a new stage from scratch
FROM alpine:latest

# Install mongodb client 
RUN apk --no-cache add mongodb-tools 

# Set the working directory inside the container
WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/myapp .

# Copy the .evn file
COPY .env .

#Expose the port on which the application  will run 
EXPOSE 9000 

# Command to run the executable
CMD ["./myapp"]


