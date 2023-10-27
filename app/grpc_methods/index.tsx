import { UserServiceClient } from '@/proto/UserServiceClientPb';
import { 
GetUserRequest, 
CreateUserRequest, 
UpdateUserRequest, 
DeleteUserRequest,
GetUserResponse, 
CreateUserResponse, 
UpdateUserResponse, 
DeleteUserResponse,
GetAllUsersResponse } from '@/proto/user_pb';

export const useGrpcClientMethods = () => {
  const client = new UserServiceClient("http://localhost:8080", null, null);

  return {
    client,
    GetUserRequest, 
    CreateUserRequest, 
    UpdateUserRequest, 
    DeleteUserRequest,
    GetUserResponse, 
    CreateUserResponse, 
    UpdateUserResponse, 
    DeleteUserResponse,
    GetAllUsersResponse
  }
}