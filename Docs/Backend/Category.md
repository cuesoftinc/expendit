

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

