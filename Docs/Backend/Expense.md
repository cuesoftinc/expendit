
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
 [Back to top](#content)



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

 [Back to top](#content)


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
 [Back to top](#content)

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


 [Back to top](#content)

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
 [Back to top](#content)



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


 [Back to top](#content)


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

## Possible error message

```json
   {
    "error":"Internal Server error",
    { "user_id":"invalid user id"}
   }

```

 [Back to top](#content)
