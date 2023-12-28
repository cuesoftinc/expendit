# Settings Page
The Settings Page is divided into two tabs, each providing distinct functionalities. Users can edit personal details, manage preferences for currency and date format, and change their password. API endpoints are utilized to handle data updates and ensure a seamless user experience. This documentation outlines the key features and API endpoints associated with each tab on the Settings Page.

## Tab 1: Edit User Details
### 1. View User Details
* Endpoint: GET /api/users/user_id
* Description: Retrieve the current user's details.
* Response Format:
```
{ "id": 1, "firstName": "John", "lastName": "Doe", "email": "john.doe@example.com", "profilePhoto": "profile.jpg" }
```

### 2. Edit User Details
* Endpoint: PUT /api/users/:id
* Request Payload:
```
{ "firstName": "Updated", "lastName": "User", "email": "updated.user@example.com", "profilePhoto": "updated_profile.jpg" }
```
* Description: Update the user's first name, last name, email address, and profile photo.
* Response Format:
```
{ "id": 1, "firstName": "Updated", "lastName": "User", "email": "updated.user@example.com", "profilePhoto": "updated_profile.jpg" }
```


## Tab 2: Change Password
### 1. Change Password
* Endpoint: PUT /api/users/change-password
* Request Payload:
```
{ "currentPassword": "oldPassword", "newPassword": "newPassword123" }
```
* Description: Change the user's password.
* Response Format:
```
{ "currency": "USD", "dateFormat": "MM/DD/YYYY" }
```

### Usage
1. **Edit User Details (Tab 1)**
* Access the "User Details" tab on the Settings Page.
* Fetch and display the current user's details.
* Edit the first name, last name, email address, and profile photo.
* Click the "Save Changes" button to update the user details.

2. **Change Password (Tab 2)**
* Access the "Change Password" tab on the Settings Page.
* Enter the current password and the new password.
* Click the "Change Password" button to update the user's password.

### Error Handling
If an error occurs during any API request, appropriate error messages will be returned in the response.