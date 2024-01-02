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
> Location : http://localhost:9000/user/:id

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


> ## Content

> ## Expense

- [Create Expense](#create-expense)
- [Get All Expenses](#get-all-expenses)
- [Get Single Expense](#get-single-expense)
- [Updatee Expense](#update-expense)
- [Delete Expense](#delete-expense)
- [Get Monthly Expense](#get-monthly-expense)
- [Get User Expense](#get-user-expense)
- [Search Expense](#search-expense)


##  Create Expense

> **POST** /expense/create

| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Amount          | **required** | amount   of the expense to be created             |
| Category        | **required** | category of the expense to be created             |
| Note            | **required** | note  of the expense to be created                |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### Sample Response

> status : 200 
> Location : http://localhost:9000/expense/create

```json
   
   {
  "ID": "658eb794bb67b509750f582d",
  "amount": 440,
  "category": "Job",
  "note": "Work a website design and develoment",
  "created_at": "2023-12-29T13:12:04.5924386+01:00",
  "updated_at": "2023-12-29T13:12:04.5924386+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}

```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Category":"Expense Category is required"
        },
        {
          "Note":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```

## Get All Expense

> **GET** /expense

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


####  Sample Response

> Status : 200
> Location : http://localhost:9000/expense


```json


```

#### Possible error message

```json
{
    "message":"Internal Server Error",
    "error":[
        {
            "id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ],
}
```


## Get Single Expense

> **GET** /expense/:id

| Parameter |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   expense Id         |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 
> Status : 200
> Location : http://localhost:9000/expense/:id



```json


{
  "ID": "658eb794bb67b509750f582d",
  "amount": 440,
  "category": "Job",
  "note": "Work a website design and develoment",
  "created_at": "2023-12-29T12:12:04.592Z",
  "updated_at": "2023-12-29T12:12:04.592Z",
  "user_id": "658b558347e889a31e9ee85f"
}

```
  #### Possible error message

```json
{
    "message":"Internal Server Error",
    "error": "token is expired by 37h30m30s",
    "error":[
        {
            "id":"Invalide expense id"
        },
        {
            "use_id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ]
}
```
---

## Update Expense

> **PUT** /expense/:id


| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Amount          | **required** | amount   of the expense to be created             |
| Category        | **required** | category of the expense to be created             |
| Note            | **required** | note  of the expense to be created                |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


| Parameter |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   expense Id         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/expense/:id

```json

{
  "ID": "658eb794bb67b509750f582d",
  "amount": 560,
  "category": "Phone",
  "note": "I bought an iphone",
  "created_at": "0001-01-01T00:00:00Z",
  "updated_at": "2023-12-29T13:30:46.31401+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}

```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Category":"Expense Category is required"
        },
        {
          "Note":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```
[Back to top](#content)




## Delete Expense

> **Delete** /expense/:id


| Parameter |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   expense Id         |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### sample Response
> Status : 200 Ok
> Location: http://localhost:9000/expense/:id

```json
{
    "data":{
        "deactivated":true
    }
}

```
### Possible error messages

```json
{
  "message" : "Expense doesn't exist",
},
{
    "id": "Expense id is required or is not a number"
},
{
   "X-User":"Invalid User id"
}
{
  "Token": "Invalid token"
}
```

## Search Expense

> **GET** /expense/searcg?query=action


| Parameters         |              | Description      |
| ----------     | ------------ | -------------------- |
| query         |   **required** | query               |
| action        | **required** | search action    |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/expense/search?query=action

```json
{
  "ID": "658eb794bb67b509750f582d",
  "amount": 560,
  "category": "Phone",
  "note": "I bought an iphone",
  "created_at": "0001-01-01T00:00:00Z",
  "updated_at": "2023-12-29T13:30:46.31401+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}
```
#### Possible error message

```json

{
    "message":"Internal Server Error",
    "error":[
        {
            "user_id":"Invalid user id"
        },
        {
            "action":"action required"
        },
        {
            "query":"query required"
        }
    ]
}
```

## Get User Expense 
> **GET** /expense/user/:userID
| Param      |              | Description          |
| --------- | ------------ | -------------------- |
| User_id    | **required** | user id          |

  | Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


## Sample Response

Status: 200
Location: http://localhost:9000/expense/user/expense/:userID
```json
{
  "results": [
    {
      "ID": "658b591b47e889a31e9ee863",
      "amount": 200,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-26T22:52:11.372Z",
      "updated_at": "2023-12-26T22:52:11.372Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b5cf3064c731f8bdd0313",
      "amount": 230,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-26T23:08:35.596Z",
      "updated_at": "2023-12-26T23:08:35.596Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b5d32064c731f8bdd0317",
      "amount": 340,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-26T23:09:38.075Z",
      "updated_at": "2023-12-26T23:09:38.075Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b5f3863a83cdffefb5867",
      "amount": 640,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-26T23:18:16.47Z",
      "updated_at": "2023-12-26T23:18:16.47Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b602c0541cdf99dd97d4b",
      "amount": 640,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-26T23:22:20.621Z",
      "updated_at": "2023-12-26T23:22:20.621Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b6dd398e13cd82dbe0056",
      "amount": 440,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-27T00:20:35.978Z",
      "updated_at": "2023-12-27T00:20:35.978Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658b7844a4c3dc9710049ccc",
      "amount": 440,
      "category": "Job",
      "note": "Work a website design and develoment",
      "created_at": "2023-12-27T01:05:08.294Z",
      "updated_at": "2023-12-27T01:05:08.294Z",
      "user_id": "658b558347e889a31e9ee85f"
    },
    {
      "ID": "658eb794bb67b509750f582d",
      "amount": 560,
      "category": "Phone",
      "note": "I bought an iphone",
      "created_at": "2023-12-29T12:12:04.592Z",
      "updated_at": "2023-12-29T12:12:04.592Z",
      "user_id": "658b558347e889a31e9ee85f"
    }
  ]
}
```

## Possible error message

```json
   {
    "error":"Internal Server error"
   }

```





## Get Monthly Expense
> **GET** /expense/expenses/month/:userID 

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

## Sample Response

Status: 200
Location: http://localhost:9000/expense/expenses/month/:userID

<!-- Montly Expense -->
```json
{
  "totalExpense": 3370
}
```
====================================================================================================


> ## Content

> ## Income

- [Create Income](#create-income)
- [Get All Income](#get-all-income)
- [Get Single Income](#get-single-income)
- [Updatee Income](#update-Income)
- [Delete Income](#delete-income)
- [Get Monthly Income](#get-monthly-income)
- [Get User Income](#get-user-income)
- [Search Income](#search-income)


##  Create Income

> **POST** /income/create

| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Amount          | **required** |  amount   of the income to be created             |
| Description     | **required** |  description of the income to be created          |
| Source          | **required** |  source of the income to be created               |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### Sample Response

> status : 200 
> Location : http://localhost:9000/income/create

```json
   
   {
  "ID": "658ec0babb67b509750f582f",
  "amount": 400,
  "description": "I built a fully function website",
  "source": "Side gig",
  "created_at": "2023-12-29T13:51:06.8999758+01:00",
  "updated_at": "2023-12-29T13:51:06.8999758+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}

```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Description":"Expense Category is required"
        },
        {
          "Source":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```

## Get All Income

> **GET** /income

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


####  Sample Response

> Status : 200
> Location : http://localhost:9000/income


```json

{
  "ID": "658ec0babb67b509750f582f",
  "amount": 400,
  "description": "I built a fully function website",
  "source": "Side gig",
  "created_at": "2023-12-29T13:51:06.8999758+01:00",
  "updated_at": "2023-12-29T13:51:06.8999758+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}
```

#### Possible error message

```json
{
    "message":"Internal Server Error",
    "error":[
        {
            "id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ],
}
```


## Get Single Income

> **GET** /income/:id

| Parameter      |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   expense Id         |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 
> Status : 200
> Location : http://localhost:9000/income/:id



```json
{
  "ID": "658ec0babb67b509750f582f",
  "amount": 400,
  "description": "I built a fully function website",
  "source": "Side gig",
  "created_at": "2023-12-29T13:51:06.8999758+01:00",
  "updated_at": "2023-12-29T13:51:06.8999758+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}

```
  #### Possible error message

```json
{
    "message":"Internal Server Error",
    "error":[
        {
            "id":"Invalide expense id"
        },
        {
            "use_id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ]
}
```
---

## Update Expense

> **PUT** /income/:id


| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Amount          | **required** | amount   of the expense to be created             |
| Category        | **required** | category of the expense to be created             |
| Note            | **required** | note  of the expense to be created                |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/income/:id

```json
{
  "ID": "658ec0babb67b509750f582f",
  "amount": 600,
  "description": "I built a fully function website",
  "source": "Side hustle",
  "created_at": "2023-12-29T13:51:06.8999758+01:00",
  "updated_at": "2023-12-29T13:51:06.8999758+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}
```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Category":"Expense Category is required"
        },
        {
          "Note":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```
[Back to top](#content)




## Delete Income

> **Delete** /income/:id

| Parameter      |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   expense Id         |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### sample Response
> Status : 200 Ok
> Location: http://localhost:9000/income/:id

```json
{
    "data":{
        "deactivated":true
    }
}

```
### Possible error messages

```json
{
  "message" : "Expense doesn't exist",
},
{
    "id": "Expense id is required or is not a number"
},
{
   "X-User":"Invalid User id"
}
{
  "Token": "Invalid token"
}
```

## Search Income 

> **GET** /income/searcg?query=action


| Parameters         |              | Description      |
| ----------     | ------------ | -------------------- |
| query         |   **required** | query               |
| action        | **required** | search action    |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/income/search?query=action

```json
{
  "ID": "658ec0babb67b509750f582f",
  "amount": 400,
  "description": "I built a fully function website",
  "source": "Side gig",
  "created_at": "2023-12-29T13:51:06.8999758+01:00",
  "updated_at": "2023-12-29T13:51:06.8999758+01:00",
  "user_id": "658b558347e889a31e9ee85f"
}
```
#### Possible error message

```json

{
    "message":"Internal Server Error",
    "error":[
        {
            "user_id":"Invalid user id"
        },
        {
            "action":"action required"
        },
        {
            "query":"query required"
        }
    ]
}
```

## Get Monthly Income
> **GET** /income/incomes/month/:userID 

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

## Sample Response

Status: 200
Location: http://localhost:9000/income/incomes/monthly/month/:userID

<!-- Montly Expense -->
```json
{
  "totalIncome":4300
}
```

======================



> ## Content

> ## Category

- [Create   Category](#create-category)
- [Get All Categories](#get-all-categories)
- [Get Single Category](#get-single-categories)
- [Update Category](#update-category)
- [Delete Category](#delete-category)
- [Search Category](#search-category)


##  Create Category

> **POST** /category/create

| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Name          | **required** | amount   of the expense to be created             |



| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### Sample Response

> status : 200 
> Location : http://localhost:9000/category/create

```json
   
   {
  "id": "658edb6083e442f79c1ab08d",
  "name": "Contract",
  "created_at": "2023-12-29T15:44:48.3680645+01:00",
  "updated_at": "2023-12-29T15:44:48.3680645+01:00"
}

```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Category":"Expense Category is required"
        },
        {
          "Note":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```

## Get All Category

> **GET** /category

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


####  Sample Response

> Status : 200
> Location : http://localhost:9000/category


```json

[
  {
    "id": "657cdd37086e633e2d90bf79",
    "name": "Gossery",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "657cddc4086e633e2d90bf7b",
    "name": "Grocery",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "657d8d9108ced08b617cfecc",
    "name": "Grocery",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "657d8f314d6422555a4b1bde",
    "name": "Grocery",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "657d8f394d6422555a4b1be0",
    "name": "Grocery",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "657d8fe19dceccfe0d67a5b2",
    "name": "Beans",
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z"
  },
  {
    "id": "658edb6083e442f79c1ab08d",
    "name": "Contract",
    "created_at": "2023-12-29T14:44:48.368Z",
    "updated_at": "2023-12-29T14:44:48.368Z"
  }
]
```

#### Possible error message

```json
{
    "message":"Internal Server Error",
    "error":[
        {
            "id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ],
}
```


## Get Single Category

> **GET** /category/:id

| Parameter      |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   caategory Id         |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 
> Status : 200
> Location : http://localhost:9000/category/:id



```json
{
  "id": "658edb6083e442f79c1ab08d",
  "name": "Contract",
  "created_at": "2023-12-29T14:44:48.368Z",
  "updated_at": "2023-12-29T14:44:48.368Z"
}
```
  #### Possible error message

```json
{
    "message":"Internal Server Error",
    "error":[
        {
            "id":"Invalide expense id"
        },
        {
            "use_id":"Invalid user id"
        },
        {
            "Token":"Unauthorized header"
        },
    ]
}
```
---

## Update Category

> **PUT** /category/:id


| Body            |              | Description                                       |
| --------------- | ------------ | ------------------------------------------------- |
| Name          | **required** | amount   of the expense to be created             |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/category/:id

```json
{
  "id": "658edb6083e442f79c1ab08d",
  "name": "Gig",
  "created_at": "0001-01-01T00:00:00Z",
  "updated_at": "2023-12-29T15:45:27.2282489+01:00"
}

```

#### Possible error message

```json

{
    "message":"User not authorized",
    "error":[
        {
            "Amount":"ExpenseAmount is required"
        },
        {
            "Category":"Expense Category is required"
        },
        {
          "Note":"Expense note is required"
        },
        {
            "id":"invalid user id"
        },
        {
            "Token":"Unauthorized token"
        }
    ]
}

```
[Back to top](#content)




## Delete Category

> **Delete** /category/:id
| Parameter      |              | Description          |
| ----------| ------------ | -------------------- |
| id        | **required** |   category Id         |

| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |

#### sample Response
> Status : 200 Ok
> Location: http://localhost:9000/category/:id

```json
{
    "data":{
        "deactivated":true
    }
}

```
### Possible error messages

```json
{
  "message" : "Expense doesn't exist",
},
{
    "id": "Expense id is required or is not a number"
},
{
   "X-User":"Invalid User id"
}
{
  "Token": "Invalid token"
}
```

## Search Category 

> **GET** /category/searcg?query=action


| Parameters         |              | Description      |
| ----------     | ------------ | -------------------- |
| query         |   **required** | query               |
| action        | **required** | search action    |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |



| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


#### Sample Response 

> Status: 200
> Location : http://localhost:9000/category/search?query=action

```json
```
#### Possible error message

```json

{
    "message":"Internal Server Error",
    "error":[
        {
            "user_id":"Invalid user id"
        },
        {
            "action":"action required"
        },
        {
            "query":"Search query is required"
        }
    ]
}
```
======================


## Content

> ##  Report 

- [Get Monthly Report](#get-monthly-report)

## Get Monthly Report

> **GET** /report/monthly/:userID



| Param          |              | Description          |
| ----------     | ------------ | -------------------- |
| user_id        | **required** | user Id              |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |


| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |



#### Sample Response

> status: 200
> Location : http://localhost:9000/report/monthly/:userID

```json


{
  "totalIncome": [
    {
      "month": "December",
      "totalIncome": 26400
    }
  ],
  "totalExpense": [
    {
      "month": "December",
      "totalExpense": 2930
    }
  ]
}

```


#### Possible error message

```json

{
    "message":"Internal Server Error",
    "error":[
        {
            "user_id":"Invalid user id"
        },
        {
            "Token":"invalid token "
        },
    ]
}
```


























































































































































































































































































