# Income Page
The Income Page facilitates the management of income records, allowing users to create income entries. These operation is executed through an API endpoint that interact with the backend database. This documentation outlines the key features and API endpoints associated with the Income Page, including payload details and validation procedures.

## Features
### **Create Income**
**Endpoint**: POST /api/income/create\
**Request Payload**:
```
{ "source": "Side Job", "amount": 800, "description": "Extra income" }

```
**Description**: Create a new income entry with specified source, amount, and description, and store it in the database.\
**Response Format**:
```
{ "id": 3, "source": "Side Job", "amount": 800, "description": "Extra income" }
```
### **View Total Income**
**Endpoint**: GET /api/income/incomes/month/:id\
**Description**: Retrieve a list of existing income entries from the database.\
**Response Format**:
```
{TotalIncome: 140000}
```

## Validation Procedures
**Create Income Entry**
* Source : Required field.
* Amount: Required field.
Must be a positive numeric value.
* Description:
Required field.
Limited to a certain length (e.g. 150 characters).

## Usage
1. **View TotalIncome**
* Fetch and display the totalIncome on the overview Page.
2. **Create Income**
* Access the "Create Income" section on the Income Page.
* Enter the source, amount and description of the new income.
* Click the "Add Income" button to add the income to the database.
* The new income will be added to the totalIncome.