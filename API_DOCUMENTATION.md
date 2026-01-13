# Glamhub Backend API Documentation

## 🌐 Base URL

```
http://api.adwebtest.online/api
```

---

## 📋 Table of Contents

- [Health Check](#health-check)
- [Authentication Endpoints](#authentication-endpoints)
- [OTP Endpoints](#otp-endpoints)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication](#authentication)

---

## Health Check

### Check API Status

**GET** `/api/health`

Check if the API and database are running properly.

**Response:**
```json
{
  "success": true,
  "message": "Glamhub API is running!",
  "timestamp": "2026-01-14T01:20:00.000Z",
  "database": {
    "status": "connected",
    "connected": true,
    "host": "ac-fwqm0xc-shard-00-02.ynz01jy.mongodb.net",
    "name": "glamhub"
  }
}
```

**cURL Example:**
```bash
curl http://api.adwebtest.online/api/health
```

---

## Authentication Endpoints

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "role": "user"
}
```

**Roles:** `user`, `artist`, `admin`

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Note:** Token is also set as HTTP-only cookie automatically.

---

### Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user",
    "createdAt": "2026-01-14T01:20:00.000Z"
  }
}
```

---

### Update Profile

**PUT** `/api/auth/update-profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "1111111111"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "...",
    "name": "John Updated",
    "email": "john@example.com",
    "phone": "1111111111"
  }
}
```

---

### Update Password

**PUT** `/api/auth/update-password`

Change user password.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### Forgot Password

**POST** `/api/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### Reset Password

**POST** `/api/auth/reset-password/:token`

Reset password using reset token from email.

**URL Parameters:**
- `token` - Reset token from email

**Request Body:**
```json
{
  "password": "newpassword789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### Check Username Availability

**GET** `/api/auth/check-username/:username`

Check if a username is available.

**URL Parameters:**
- `username` - Username to check

**Response:**
```json
{
  "success": true,
  "available": true
}
```

---

### Logout

**POST** `/api/auth/logout`

Logout the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## OTP Endpoints

### Send Registration OTP

**POST** `/api/otp/send-registration-otp`

Send OTP for registration verification (Public).

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

---

### Verify Registration OTP

**POST** `/api/otp/verify-registration-otp`

Verify OTP during registration (Public).

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

---

### Send Email OTP

**POST** `/api/otp/send-email`

Send OTP to email (Protected - requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

---

### Send Phone OTP

**POST** `/api/otp/send-phone`

Send OTP to phone (Protected - requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "1234567890"
}
```

---

### Verify OTP

**POST** `/api/otp/verify`

Verify OTP (Protected - requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "otp": "123456",
  "type": "email"
}
```

**Type:** `email` or `phone`

---

### Resend OTP

**POST** `/api/otp/resend`

Resend OTP (Protected - requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "email"
}
```

**Type:** `email` or `phone`

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]
}
```

---

## Error Handling

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

### Error Response Example
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## Authentication

### JWT Token

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-token-here>
```

### Getting Token

1. Register or Login to get a token
2. Token is returned in response `data.token`
3. Token is also automatically set as HTTP-only cookie

### Token Usage

Include the token in headers for protected routes:

```javascript
fetch('http://api.adwebtest.online/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include' // Important for cookies
})
```

---

## Testing the API

### Using cURL

**Health Check:**
```bash
curl http://api.adwebtest.online/api/health
```

**Login:**
```bash
curl -X POST http://api.adwebtest.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

**Get Profile (with token):**
```bash
curl http://api.adwebtest.online/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the `glamhub-api-postman.json` collection
2. All endpoints are pre-configured with the server URL
3. Login endpoint automatically saves token to collection variable
4. Protected routes use the saved token automatically

---

## Frontend Integration Example

### JavaScript/Fetch

```javascript
const API_BASE_URL = 'http://api.adwebtest.online/api';

// Login
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    // Save token to localStorage
    localStorage.setItem('token', data.data.token);
    return data;
  }
  throw new Error(data.message);
}

// Get Profile
async function getProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });
  
  return await response.json();
}
```

### Axios Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://api.adwebtest.online/api',
  withCredentials: true, // Important for cookies
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.success) {
    localStorage.setItem('token', response.data.data.token);
  }
  return response.data;
};

// Get Profile
const getProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
```

---

## Notes for Frontend Developer

1. **Base URL:** `http://api.adwebtest.online/api`
2. **CORS:** Already configured for your frontend domain
3. **Cookies:** API sets HTTP-only cookies on login - use `credentials: 'include'` in fetch
4. **Token Storage:** Save token from login response to localStorage/sessionStorage
5. **Headers:** Always include `Authorization: Bearer <token>` for protected routes
6. **Error Handling:** Check `success` field in response before using `data`

---

## Support

For issues or questions, contact the backend team.

**Last Updated:** January 14, 2026
