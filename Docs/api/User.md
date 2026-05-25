# Expendit Backend 

## Description

The API is in charge of all expendit activities and functions 

> ## Content

> ## User

- [User Signup ](#user-signup)
- [User Signin](#user-signin)
- [Get Single User](#get-single-user)
- [Get All Users](#get-all-users)
- [Update  User](#update-user)
- [Change User Password](#change-user-password)
- [Forget User Password](#forgot-user-password)
- [Reset User Password](#reset-user-password)

## User Signup 

> **POST** /user/signin

| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| First_name      | **required** | first name  of the account to be created          |
| Last_name       | **required** | last_name of the account to be created            |
| Phone           | **required** | phone number of the account to be created         |
| email           | **required** | email address  of the account to be created       |
| Password        | **required** | password of  the account to be created            |
| User_type       | **required** | user type of the account to be created            |

#### Sample Response

> Status : 200 Created
> Location : http://localhost:9000/users/signup

```json

```

### Possible error message

```json
{
    "message":"User already exist or input validation error ",
     "errors":[
        {
            "First_name":"first name is required"
        },
        {
            "Last_name":"Last name is required"
        },
        {
          "Email":"Email is required"
        },
        {
            "Phone":"Not a valid phone number format"
        },
        {
            "Password":"Not a valid password format"
        },
        {
          "User_type":"User type required"
        }

     ]
}
```

 [Back to top](#content)

 ---

 ## User Signin


> **PUT** /user/signin

| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| email           | **required** | email address  of the account to be created       |
| Password        | **required** | password of  the account to be created            |


## Sample Response


> Status: 200 Ok
> Location : http://http://localhost:9000/users/signin


```json

{
  "ID": "658b558347e889a31e9ee85f",
  "first_name": "Fanta",
  "last_name": "Coke",
  "email": "fantacoke@gmail.com",
  "password": "$2a$14$aSngOcAxvNSUeh9LkeJ7ReK0a8z5JKWb307cyq/iBlxUKPgyytEPa",
  "phone": "02938872813",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6ImZhbnRhY29rZUBnbWFpbC5jb20iLCJGaXJzdF9uYW1lIjoiRmFudGEiLCJMYXN0X25hbWUiOiJDb2tlIiwiVWlkIjoiNjU4YjU1ODM0N2U4ODlhMzFlOWVlODVmIiwiVXNlcl90eXBlIjoiQURNSU4iLCJleHAiOjE3MDM3NTcxNjB9.L0HiRH399fEF1EssIUGrymV9lmeth3OJtbEu0QqIt-4",
  "user_type": "ADMIN",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IiIsIkZpcnN0X25hbWUiOiIiLCJMYXN0X25hbWUiOiIiLCJVaWQiOiIiLCJVc2VyX3R5cGUiOiIiLCJleHAiOjE3MDQyNzU1NjB9.Uy4VpN9RIMMshY5k94EJEmDr-D8JEXpY8B2ZWVLxKwo",
  "created_at": "2023-12-26T22:36:51Z",
  "updated_at": "2023-12-27T09:52:40Z",
  "user_id": "658b558347e889a31e9ee85f"
}

```
### Possible error messages

```json
  {
    "message":"user does not exist"}
   "error" :[
    {
        "email":"Invalid email address",
        
    },
    {
        "Password":"Invalid password"
    }
   ]

```


---

## Get All Users


> **GET** / user

#### Sample Response

> Status : 200
> Location : http://localhost:9000/user

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |




```json
[ 
 {
  "ID": "658b558347e889a31e9ee85f",
  "first_name": "Fanta",
  "last_name": "Coke",
  "email": "fantacoke@gmail.com",
  "password": "$2a$14$aSngOcAxvNSUeh9LkeJ7ReK0a8z5JKWb307cyq/iBlxUKPgyytEPa",
  "phone": "02938872813",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6ImZhbnRhY29rZUBnbWFpbC5jb20iLCJGaXJzdF9uYW1lIjoiRmFudGEiLCJMYXN0X25hbWUiOiJDb2tlIiwiVWlkIjoiNjU4YjU1ODM0N2U4ODlhMzFlOWVlODVmIiwiVXNlcl90eXBlIjoiQURNSU4iLCJleHAiOjE3MDM3NTcxNjB9.L0HiRH399fEF1EssIUGrymV9lmeth3OJtbEu0QqIt-4",
  "user_type": "ADMIN",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IiIsIkZpcnN0X25hbWUiOiIiLCJMYXN0X25hbWUiOiIiLCJVaWQiOiIiLCJVc2VyX3R5cGUiOiIiLCJleHAiOjE3MDQyNzU1NjB9.Uy4VpN9RIMMshY5k94EJEmDr-D8JEXpY8B2ZWVLxKwo",
  "created_at": "2023-12-26T22:36:51Z",
  "updated_at": "2023-12-27T09:52:40Z",
  "user_id": "658b558347e889a31e9ee85f"
}
]

```

### Possible error message

```json
{
    "error":"Internal server error"
}
   
```

## Get Single User


> **GET** /user/:id

#### Sample Response

> Status : 200
> Location : http://localhost:9000/user/:id

| Param          |              | Description          |
| ----------     | ------------ | -------------------- |
| user_id        | **required** | user Id              |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |




```json

 {
  "ID": "658b558347e889a31e9ee85f",
  "first_name": "Fanta",
  "last_name": "Coke",
  "email": "fantacoke@gmail.com",
  "password": "$2a$14$aSngOcAxvNSUeh9LkeJ7ReK0a8z5JKWb307cyq/iBlxUKPgyytEPa",
  "phone": "02938872813",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6ImZhbnRhY29rZUBnbWFpbC5jb20iLCJGaXJzdF9uYW1lIjoiRmFudGEiLCJMYXN0X25hbWUiOiJDb2tlIiwiVWlkIjoiNjU4YjU1ODM0N2U4ODlhMzFlOWVlODVmIiwiVXNlcl90eXBlIjoiQURNSU4iLCJleHAiOjE3MDM3NTcxNjB9.L0HiRH399fEF1EssIUGrymV9lmeth3OJtbEu0QqIt-4",
  "user_type": "ADMIN",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IiIsIkZpcnN0X25hbWUiOiIiLCJMYXN0X25hbWUiOiIiLCJVaWQiOiIiLCJVc2VyX3R5cGUiOiIiLCJleHAiOjE3MDQyNzU1NjB9.Uy4VpN9RIMMshY5k94EJEmDr-D8JEXpY8B2ZWVLxKwo",
  "created_at": "2023-12-26T22:36:51Z",
  "updated_at": "2023-12-27T09:52:40Z",
  "user_id": "658b558347e889a31e9ee85f"
}

```

#### Possible Error message

```json
{
    "error":"Invalid ID"
}

```


[Back to top](#content)




---

## Update  User

> **PUT** /user/:id


| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| First_name      | **required** | first name  of the account to be created          |
| Last_name       | **required** | last_name of the account to be created            |
| Phone           | **required** | phone number of the account to be created         |
| email           | **required** | email address  of the account to be created       |
| User_type       | **required** | user type of the account to be created            |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| user_id        | **required** | user Id              |

| param          |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |

| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |



#### Sample Response

> Status : 200 Ok
> Location : http://localhost:9000/user/:id


```json

 {
  "ID": "658b558347e889a31e9ee85f",
  "first_name": "John",
  "last_name": "Doe",
  "email": "johndoe@gmail.com",
  "password": "$2a$14$aSngOcAxvNSUeh9LkeJ7ReK0a8z5JKWb307cyq/iBlxUKPgyytEPa",
  "phone": "02938872813",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6ImZhbnRhY29rZUBnbWFpbC5jb20iLCJGaXJzdF9uYW1lIjoiRmFudGEiLCJMYXN0X25hbWUiOiJDb2tlIiwiVWlkIjoiNjU4YjU1ODM0N2U4ODlhMzFlOWVlODVmIiwiVXNlcl90eXBlIjoiQURNSU4iLCJleHAiOjE3MDM3NTcxNjB9.L0HiRH399fEF1EssIUGrymV9lmeth3OJtbEu0QqIt-4",
  "user_type": "USER",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IiIsIkZpcnN0X25hbWUiOiIiLCJMYXN0X25hbWUiOiIiLCJVaWQiOiIiLCJVc2VyX3R5cGUiOiIiLCJleHAiOjE3MDQyNzU1NjB9.Uy4VpN9RIMMshY5k94EJEmDr-D8JEXpY8B2ZWVLxKwo",
  "created_at": "2023-12-26T22:36:51Z",
  "updated_at": "2023-12-27T09:52:40Z",
  "user_id": "658b558347e889a31e9ee85f"
}

```

#### Possible error message

```json
    {
        "message":"Internal server error",
        
    },

```

[Back to top](#content)


##  Update User Password 

> **PUT** /user/:id


| Body             |              | Description                                        |
| ---------------  | ------------ | -------------------------------------------------  |
| Old_Password     | **required** | old password   of the account to be provided       |
| New_Password     | **required** | new password  of the account to be created         |
| Confirm_password | **required** | confirm new  password of the account to be created |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |

| Param         |              | Description          |
| ----------    | ------------ | -------------------- |
| user_id       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |




#### Sample Response

> Status : 200 Created
> Location : http://localhost:9000/users/:id

```json

{
    "message":"Password updated"
}
```




###  Possible error messages

```json
   {
    "message":"Internal Server error",
    "error":[
        {
            "id":"User Id is required or is not a number"
        },
        {
            "old_password":"old password not correct or required"
        },
        {
            "new_password":"Not a valid password format"
        },
        {
            "confirm_password":"password does not match"
        }
    ]
   }

```
 [Back to top](#content)

## Forgot User Password

> **POST** /user/forgot-password

| Body             |              | Description                                        |
| ---------------  | ------------ | -------------------------------------------------  |
|   email   | **required** | email   of the account to be provided       |


### sample Response

> status :200 Created
> Location : http://localhost:9000/users/forgot-password

```json
{
    "message":"Reset password email sent successfully"
}

```

### Possible error messages

```json 
{
    "message":"Internal server error",
    "error":[
        {"email":"incorrect user email"}
    ]
}

```

[Back to top](#content)


## Reset User Password

**PATCH** /users/reset-password
| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| new_password      | **required** | new password   of the account to be created          |
| con_password       | **required** | Confirm new password  of  the account to be created      |


| Param         |              | Description          |
| ----------    | ------------ | -------------------- |
| reset_token       | **required** |  reset token             |

#### Sample Response

> Status: 200 Created
> Location : http://localhost:9000/users/reset-password

```json

 {
    "message":"password resaet successfully"
 }
```


#### Possible error messages

```json 
  {
    "message":"Internal Server error",
    "error":[
       { "token":"invalid or expired reset token"},
       {"new_password":"new password required"},
       {"con_password":"invalid confirm password"}
    ]
  }

```
 [Back to top](#content)