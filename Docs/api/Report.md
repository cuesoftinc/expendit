
## Content

> ##  Report 

- [Get Monthly Report](#get-monthly-report)
- [Get Monthly Category Report ](#get-monthly-category-report)
- [Get Monthly Expenses Category Report](#get-monthly-expenses-category)

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
  "result": [
    {
      "month": "December",
      "totalIncome": 26400,
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
 [Back to top](#content)

## Get Monthly Category Report

> **GET** /report/chart/category/:userID



| Param          |              | Description          |
| ----------     | ------------ | -------------------- |
| user_id        | **required** | user Id              |


| Header         |              | Description          |
| ----------     | ------------ | -------------------- |
| X-UserID       | **required** | user Id              |

| Auth      |              | Description          |
| --------- | ------------ | -------------------- |
| Bearer    | **required** | Bearer Token         |


### Sample Response

> Status: 200 
> Location : http://localhost:9000//report/chart/category/:userID


```json

  {
    "result":[
      {
        "Job":2930,
        "Data":3721,
        "month":"December"
        },
        {
          "Netflix":1938,
          "Food":36937,
          "Job":193028,
          "month":"January"
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
 [Back to top](#content)

## Get Monthly Expenses Category Report

> **GET** /report/chart/category/expenses/:userID


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

> Status: 200
> Location: http://localhost:9000/report/chart/category/expenses/:userID 


```json
  {
    "result":[
      {
        "category":"Job",
        "expense":4978
      },
      {
        "category":"Phone",
        "expense":1032
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
 [Back to top](#content)