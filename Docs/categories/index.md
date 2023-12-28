# Categories
The Categories Page allows users to manage expense categories by providing functionality to create, edit, and delete categories. These operations are performed through API endpoints that interact with a backend database. This an overview of the key features and API endpoints associated with the Categories Page.

## Features
### **View Categories**
**Endpoint**: GET /api/category\
**Description**: Retrieve a list of existing expense categories from the database.\
**Response Format**:
```
[
  { "id": 1, "name": "Food" },
  { "id": 2, "name": "Utilities" },
  ...
]
```
### **Create Category**
**Endpoint**: POST /api/category/create\
**Request Payload**:
```
{ "name": "New Category" }
```
**Description**: Create a new expense category and store it in the database.\
**Response Format**:
```
{ "id": 3, "name": "New Category" }
```
### **Edit Category**
**Endpoint**: PUT /api/category/:id\
**Request Payload**:
```
{ "name": "New Category" }
```
**Description**: Update the name of an existing expense category in the database.\
**Response Format**:
```
{ "id": 3, "name": "Updated Category" }
```
### **Delete Category**
**Endpoint**: DELETE /api/category/:id\
**Description**: Delete an existing expense category from the database.\
**Response Format**:
```
{ "message": "Category deleted successfully" }
```
## Usage
1. **View Categories**
* Access the Categories Page.
* Fetch and display the list of existing expense categories.
2. **Create Category**
* Access the "Create Category" section on the Categories Page.
* Enter the name of the new category.
* Click the "Create" button to add the category to the database.
* The new category will be displayed in the list of categories.
3. **Edit Category**
* Access the "Edit Category" section on the Categories Page.
* Select the category to be edited from the list.
* Modify the name of the category.
* Click the "Save Changes" button to update the category in the database.
* The updated category name will be reflected in the list.
4. **Delete Category**
* Access the "Delete Category" section on the Categories Page.
* Select the category to be deleted from the list.
* Confirm the deletion.
* The category will be removed from the database, and the list will be updated.
### Error Handling
If an error occurs during any API request, appropriate error messages will be returned in the response.