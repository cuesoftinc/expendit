
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