# Income Page
The Income Page facilitates the management of income records, allowing users to create income entries. These operation is executed through an API endpoint that interact with the backend database. This documentation outlines the key features and API endpoints associated with the Income Page, including payload details and validation procedures.

## Form Structure

The Income Form is designed to capture key details of your income:

- **Source:** Enter the source of your income
- **Amount:** Enter the income amount.
- **Description:** Provide a brief description of the income.

## Adding a New Income

To add a new income, follow these steps:

1. **Navigate to the Income Page:**

   - From the main dashboard or navigation menu, click on the "Income" page to access the income-related features.

2. **Income Form:**

   - On the Income Page, you will find an Income Form that allows you to input details about your income.

   ![Income Form](image_url)

3. **Input income Details:**

   - Fill in the required details for the new income:
     - **Source:** Enter the source of income.
     - **Amount:** Enter the income amount.
     - **Description:** Provide a brief description of the income.

   ![Income Form Filled](image_url)

4. **Validation Processes:**

   - The Income Form incorporates validation processes to ensure accurate and valid data entry. Common validations include:

     - **Source:** Include checks for length or specific character types.
     - **Amount Validation:** Ensures that the entered amount is a valid numerical value.
     - **Description Validation:** May include checks for length or specific character types.

   - If there are validation errors, the form will provide clear feedback indicating the nature of the error(s). Users will be prompted to correct the entries before proceeding.

   ![Validation Feedback](image_url)

5. **Submit the income:**

   - Once all required fields are filled correctly, click the "Add income" button to submit the income.

6. **Income Request Payload:**

   - The request payload for adding an income should be in JSON format and include the following fields:

     ```json
     {
       "source": "Salary"
       "amount": 5000.0,
       "description": "Monthly Salary"
     }
     ```

7. **Processing and User Feedback:**

   - The system processes the income addition request, simulating interactions with a database or data store.

   - During this process, users may see loading indicators or other feedback to indicate that the request is being processed.

   - If the addition is successful, the new income is added to total income and is displayed, and users receive a confirmation message.

   ![Income Added](img_url)

8. **Income Response Format:**

   - The response from the income addition request will be in JSON format and include the newly created income details:

     ```json
     {
       "id": 123,
       "source": "Salary",
       "amount": 50.0,
       "description": "Monthly Salary",
       "created_at": "2023-01-01T12:34:56Z",
       "updated_at": "2023-01-01T14:34:22Z"
     }
     ```

9. **Error Handling:**

   - In case of errors during the income addition process, users will receive appropriate error messages with guidance on how to resolve the issue.

   ![Error Handling](insert_image_url_here)

