# OTP Testing Guide

## 📱 How to Test OTP APIs

### Prerequisites
- Backend API running on `http://api.adwebtest.online/api`
- Email service configured (for email OTP)
- SMS service configured (for phone OTP) - Optional

---

## 🔐 Registration OTP Flow (Public - No Auth Required)

### Step 1: Send Registration OTP

**Endpoint:** `POST /api/otp/send-registration-otp`

**Request Body:**
```json
{
  "type": "email",
  "email": "user@example.com"
}
```

**OR for Phone:**
```json
{
  "type": "phone",
  "phone": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "expiresIn": "10 minutes",
    "tempId": "507f1f77bcf86cd799439011"
  }
```

**Important:** Save the `tempId` from the response - you'll need it for verification!

---

### Step 2: Verify Registration OTP

**Endpoint:** `POST /api/otp/verify-registration-otp`

**Request Body:**
```json
{
  "type": "email",
  "email": "user@example.com",
  "otp": "123456",
  "tempId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "verified": true,
    "verificationToken": "507f1f77bcf86cd799439011"
  }
}
```

**Use this `verificationToken` when registering the user!**

---

## 🔒 Protected OTP Flow (Requires Authentication)

### Step 1: Login First

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "artist@example.com",
  "password": "password123"
}
```

**Save the token from response!**

---

### Step 2: Send Email OTP (Protected)

**Endpoint:** `POST /api/otp/send-email`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "artist@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "email": "ar***@example.com",
    "expiresIn": "10 minutes"
  }
}
```

---

### Step 3: Send Phone OTP (Protected)

**Endpoint:** `POST /api/otp/send-phone`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone": "1234567890",
  "countryCode": "+91"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your phone",
  "data": {
    "phone": "+91 123 **** 90",
    "expiresIn": "10 minutes"
  }
}
```

---

### Step 4: Verify OTP (Protected)

**Endpoint:** `POST /api/otp/verify`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "otp": "123456",
  "type": "email"
}
```

**OR for Phone:**
```json
{
  "otp": "123456",
  "type": "phone"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "verified": true,
    "type": "email"
  }
}
```

---

### Step 5: Resend OTP (If Needed)

**Endpoint:** `POST /api/otp/resend`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "email"
}
```

**OR:**
```json
{
  "type": "phone"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

---

## 🧪 Testing with Postman

### Quick Test Flow:

1. **Send Registration OTP:**
   - Method: POST
   - URL: `http://api.adwebtest.online/api/otp/send-registration-otp`
   - Body: `{"type": "email", "email": "test@example.com"}`
   - Check your email for OTP (or check server logs in development)

2. **Verify Registration OTP:**
   - Method: POST
   - URL: `http://api.adwebtest.online/api/otp/verify-registration-otp`
   - Body: `{"type": "email", "email": "test@example.com", "otp": "123456", "tempId": "FROM_STEP_1"}`

3. **Login:**
   - Method: POST
   - URL: `http://api.adwebtest.online/api/auth/login`
   - Body: `{"email": "test@example.com", "password": "password123"}`
   - Copy the token from response

4. **Send Protected OTP:**
   - Method: POST
   - URL: `http://api.adwebtest.online/api/otp/send-email`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: `{"email": "test@example.com"}`

5. **Verify Protected OTP:**
   - Method: POST
   - URL: `http://api.adwebtest.online/api/otp/verify`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: `{"otp": "123456", "type": "email"}`

---

## 📧 Email OTP Testing (Development)

If email service is not configured, check:
- Server console logs (OTP will be logged)
- Email service configuration in `.env`

**Environment Variables Needed:**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@glamhub.com
```

---

## 📱 Phone OTP Testing (Development)

If SMS service is not configured:
- OTP will be logged in server console
- Response will include `development: true` flag

**Environment Variables Needed:**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## ⚠️ Important Notes

1. **OTP Expiry:** OTPs expire after 10 minutes
2. **Cooldown:** Wait 1 minute between OTP requests
3. **Max Attempts:** 5 failed attempts will invalidate the OTP
4. **Development Mode:** In development, OTPs are logged to console if email/SMS not configured
5. **Registration Flow:** Use `tempId` from send-registration-otp response in verify-registration-otp

---

## 🐛 Troubleshooting

### OTP Not Received?
- Check server logs for OTP value (development mode)
- Verify email/SMS service configuration
- Check spam folder for emails
- Wait 1 minute before requesting again (cooldown)

### "OTP expired or not found" Error?
- OTP expires after 10 minutes
- Request a new OTP
- Make sure you're using the correct email/phone

### "Too many failed attempts" Error?
- You've exceeded 5 failed attempts
- Request a new OTP
- Wait for cooldown period

### "Please wait X seconds before resending"?
- 1-minute cooldown between OTP requests
- Wait for the specified time
- Or use the resend endpoint

---

## ✅ Complete Registration Flow Example

```javascript
// 1. Send Registration OTP
POST /api/otp/send-registration-otp
{
  "type": "email",
  "email": "artist@example.com"
}
// Response: { tempId: "abc123", ... }

// 2. Verify Registration OTP
POST /api/otp/verify-registration-otp
{
  "type": "email",
  "email": "artist@example.com",
  "otp": "123456",
  "tempId": "abc123"
}
// Response: { verificationToken: "xyz789", ... }

// 3. Register User
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "artist@example.com",
  "password": "password123",
  "role": "artist",
  "agreeToPrivacyPolicy": true
}
// Response: { token: "...", user: {...} }
```

---

**Last Updated:** January 14, 2026
