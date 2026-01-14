# Forgot Password Flow - Complete Process

## Overview
The forgot password flow uses **OTP (4-digit code)** sent via email. There are **3 screens** and **2 API calls**.

---

## Screen 1: Forgot Password Page
**UI:** User enters email address  
**API Call:** `POST /api/auth/forgot-password`

### Request:
```json
{
  "email": "user@example.com"
}
```

### Response:
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "data": {
    "email": "us***@example.com",
    "expiresIn": "10 minutes"
  }
}
```

### What happens:
- ✅ Generates a **4-digit OTP**
- ✅ Sends OTP to user's email
- ✅ OTP expires in **10 minutes**
- ✅ 1-minute cooldown between requests

### Frontend Action:
- Show success message: "Verification code sent to your email"
- Navigate to **Screen 2: Verify Code**

---

## Screen 2: Verify Code Page
**UI:** User enters 4-digit OTP code  
**API Call:** None (just collect OTP, verify in next step)

### Frontend Action:
- User enters 4-digit code
- Show "Resend Code" option (calls same API as Screen 1)
- When user clicks "Continue", proceed to **Screen 3**

---

## Screen 3: Recovery Password Page
**UI:** User enters new password and confirms it  
**API Call:** `POST /api/auth/reset-password`

### Request:
```json
{
  "email": "user@example.com",
  "otp": "1234",
  "password": "newpassword123"
}
```

### Response (Success):
```json
{
  "success": true,
  "message": "Password reset successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "email": "user@example.com",
      ...
    }
  }
}
```

### Response (Error - Invalid OTP):
```json
{
  "success": false,
  "message": "Invalid OTP",
  "data": {
    "attemptsRemaining": 2
  }
}
```

### Response (Error - Expired OTP):
```json
{
  "success": false,
  "message": "OTP expired or not found. Please request a new one."
}
```

### What happens:
- ✅ Verifies the 4-digit OTP
- ✅ Checks if OTP is expired (10 minutes)
- ✅ Checks max attempts (3 attempts allowed)
- ✅ Sets new password
- ✅ Returns JWT token (user is logged in)
- ✅ Deletes the used OTP

### Frontend Action:
- If successful: Store token, redirect to dashboard/home
- If error: Show error message, allow retry or go back to Screen 1

---

## Complete Flow Diagram

```
┌─────────────────────────┐
│  Screen 1: Forgot       │
│  Password               │
│  [Enter Email]          │
└───────────┬─────────────┘
            │
            │ POST /api/auth/forgot-password
            │ { "email": "user@example.com" }
            │
            ▼
┌─────────────────────────┐
│  Screen 2: Verify Code   │
│  [Enter 4-digit OTP]     │
│  [Resend Code]           │
└───────────┬─────────────┘
            │
            │ User enters OTP
            │
            ▼
┌─────────────────────────┐
│  Screen 3: Recovery      │
│  Password                │
│  [New Password]          │
│  [Confirm Password]      │
└───────────┬─────────────┘
            │
            │ POST /api/auth/reset-password
            │ {
            │   "email": "user@example.com",
            │   "otp": "1234",
            │   "password": "newpassword123"
            │ }
            │
            ▼
      ✅ Success!
      User logged in
      Redirect to dashboard
```

---

## API Endpoints Summary

### 1. Forgot Password (Send OTP)
- **Endpoint:** `POST /api/auth/forgot-password`
- **Screen:** Screen 1 (Forgot Password)
- **Body:** `{ "email": "user@example.com" }`
- **Response:** OTP sent to email

### 2. Reset Password (Verify OTP + Set New Password)
- **Endpoint:** `POST /api/auth/reset-password`
- **Screen:** Screen 3 (Recovery Password)
- **Body:** 
  ```json
  {
    "email": "user@example.com",
    "otp": "1234",
    "password": "newpassword123"
  }
  ```
- **Response:** JWT token + user data (user is logged in)

---

## Important Notes

### OTP Details:
- **Length:** 4 digits
- **Expiry:** 10 minutes
- **Max Attempts:** 3 attempts
- **Cooldown:** 1 minute between requests

### Security:
- If email doesn't exist, still returns success (doesn't reveal if user exists)
- OTP is deleted after successful use
- Failed attempts are tracked (max 3)

### Resend Code:
- User can click "Resend Code" on Screen 2
- This calls the same API as Screen 1: `POST /api/auth/forgot-password`
- Must wait 1 minute between requests

### Error Handling:
- **Invalid OTP:** Show error, allow retry (check `attemptsRemaining`)
- **Expired OTP:** Show error, redirect to Screen 1 to request new OTP
- **Too many attempts:** Show error, redirect to Screen 1

---

## Frontend Implementation Example

```javascript
// Screen 1: Forgot Password
const handleForgotPassword = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  if (data.success) {
    // Navigate to Screen 2 (Verify Code)
    navigate('/verify-code', { state: { email } });
  }
};

// Screen 2: Verify Code (just collect OTP, no API call)

// Screen 3: Reset Password
const handleResetPassword = async (email, otp, password) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, password })
  });
  
  const data = await response.json();
  if (data.success) {
    // Store token
    localStorage.setItem('token', data.token);
    // Redirect to dashboard
    navigate('/dashboard');
  } else {
    // Show error message
    setError(data.message);
  }
};
```

---

## Testing

### Test Email:
Use a real email address that you can access.

### Check OTP:
- If email sending fails, check server logs: `pm2 logs glamhub-api`
- OTP will be logged if email service is not configured

### Test Flow:
1. Call forgot-password API → Check email for 4-digit code
2. Enter code on verify screen
3. Enter new password on recovery screen
4. Call reset-password API with email, OTP, and new password
5. Should receive token and be logged in
