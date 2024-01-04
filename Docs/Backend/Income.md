

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

