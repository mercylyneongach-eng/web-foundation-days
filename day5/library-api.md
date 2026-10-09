
# Library Books REST API Design

## Overview

This API allows users to view, create, update, delete, and search for books in a library.

The resource is `books`.

Base URL: `https://api.example.com`

## Endpoints

### 1. List All Books

- **Method:** GET
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Example request body:** Not required.
- **Success status code:** `200 OK`

### 2. Get One Book

- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns details of a single book identified by its ID.
- **Example request body:** Not required.
- **Success status code:** `200 OK`

### 3. Create a Book

- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publicationYear": 1958
  }
  ```

- **Success status code:** `201 Created`

### 4. Update a Book

- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publicationYear": 1958
  }
  ```

- **Success status code:** `200 OK`

### 5. Delete a Book

- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes a book from the library.
- **Example request body:** Not required.
- **Success status code:** `204 No Content`

### 6. List Books by Author

- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author using a query parameter.
- **Example request body:** Not required.
- **Success status code:** `200 OK`

## Error Codes

### 400 Bad Request

- **Description:** The request contains invalid data or parameters.
- **Example:** Creating a book without a required title or author.

### 404 Not Found

- **Description:** The requested resource does not exist.
- **Example:** Requesting `GET /books/999` when book ID 999 does not exist.