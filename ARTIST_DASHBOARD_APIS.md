# Artist Dashboard APIs - Complete Guide

## ✅ All Artist APIs Created!

All APIs for the artist dashboard are now available and organized in the Postman collection under the **"Artist"** folder.

---

## 📋 Complete Artist API List

### 🎯 **Dashboard APIs**

#### Get Dashboard Stats
**GET** `/api/artist/dashboard/stats`

Get overview statistics for the artist dashboard.

**Query Parameters:**
- `startDate` (optional) - Filter start date (YYYY-MM-DD)
- `endDate` (optional) - Filter end date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": {
      "amount": 8450,
      "currency": "AED",
      "percentageChange": 12.5
    },
    "upcomingAppointments": {
      "count": 6,
      "percentageChange": 12.5
    },
    "totalClients": {
      "count": 24,
      "percentageChange": 12.5
    },
    "averageRating": {
      "rating": 4.9,
      "totalReviews": 127,
      "percentageChange": 12.5
    }
  }
}
```

---

### 📅 **Appointment APIs**

#### Get All Appointments
**GET** `/api/artist/appointments`

Get all appointments with filters and pagination.

**Query Parameters:**
- `status` - Filter by status: `pending`, `confirmed`, `completed`, `cancelled`, `rejected`, or `all`
- `serviceType` - Filter by type: `makeup`, `hair`, `nail`, `facial`, `bridal`, `party`, `other`, or `all`
- `startDate` (optional) - Filter start date (YYYY-MM-DD)
- `endDate` (optional) - Filter end date (YYYY-MM-DD)
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "data": {
    "appointments": [...]
  }
}
```

#### Get Single Appointment
**GET** `/api/artist/appointments/:id`

Get detailed information about a specific appointment.

#### Update Appointment Status
**PUT** `/api/artist/appointments/:id/status`

Update the status of an appointment.

**Request Body:**
```json
{
  "status": "confirmed",
  "cancellationReason": ""
}
```

**Status Options:** `pending`, `confirmed`, `completed`, `cancelled`, `rejected`

---

### 💰 **Payment APIs**

#### Get Payment Stats
**GET** `/api/artist/payments/stats`

Get payment dashboard statistics.

**Query Parameters:**
- `period` - `all`, `month`, or `week`

**Response:**
```json
{
  "success": true,
  "data": {
    "availableBalance": {
      "amount": 8450.00,
      "currency": "AED"
    },
    "totalEarned": {
      "amount": 18450.00,
      "currency": "AED",
      "percentageChange": 12.5
    },
    "payoutsInTransit": {
      "amount": 5000.00,
      "currency": "AED"
    }
  }
}
```

#### Get All Transactions
**GET** `/api/artist/payments/transactions`

Get transaction history with filters.

**Query Parameters:**
- `type` - `deposit`, `withdrawal`, `refund`, or `all`
- `status` - `pending`, `succeeded`, `failed`, `cancelled`, `in_transit`, or `all`
- `startDate` (optional) - Filter start date
- `endDate` (optional) - Filter end date
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 50,
  "page": 1,
  "pages": 3,
  "data": {
    "transactions": [
      {
        "_id": "...",
        "type": "deposit",
        "amount": 125.00,
        "currency": "AED",
        "status": "succeeded",
        "description": "Full Bridal Package & Bridal Updo Styling Services",
        "clientId": {...},
        "appointmentId": {...},
        "createdAt": "2025-10-15T..."
      }
    ]
  }
}
```

#### Request Withdrawal
**POST** `/api/artist/payments/withdraw`

Request a withdrawal to bank account.

**Request Body:**
```json
{
  "amount": 5000,
  "bankDetails": {
    "bankName": "Banca Intesa AD",
    "accountNumber": "1234567890",
    "iban": "BA391290079401028494"
  },
  "description": "Withdrawal to bank account"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "data": {
    "transaction": {
      "_id": "...",
      "type": "withdrawal",
      "amount": 5000,
      "status": "in_transit",
      ...
    }
  }
}
```

---

### ⭐ **Review APIs**

#### Get Reviews
**GET** `/api/artist/reviews`

Get all reviews for an artist (Public or Protected).

**Query Parameters:**
- `artistId` (required if not authenticated) - Artist user ID
- `rating` (optional) - Filter by rating (1-5)
- `page` (default: 1)
- `limit` (default: 10)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 120,
  "page": 1,
  "pages": 12,
  "data": {
    "reviews": [
      {
        "_id": "...",
        "rating": 5,
        "categories": {
          "professionalism": 5,
          "communication": 4.9,
          "punctuality": 4.9,
          "value": 4.9
        },
        "comment": "Absolutely loved my experience...",
        "clientId": {...},
        "createdAt": "2024-09-15T..."
      }
    ],
    "stats": {
      "averageRating": 4.95,
      "categories": {
        "professionalism": 5.0,
        "communication": 4.9,
        "punctuality": 4.9,
        "value": 4.9
      },
      "totalReviews": 120
    }
  }
}
```

#### Get Single Review
**GET** `/api/artist/reviews/:id`

Get detailed information about a specific review.

---

### 🛠️ **Service APIs** (Already in Artist Folder)

- ✅ Create Service
- ✅ Get My Services
- ✅ Get Service by ID
- ✅ Update Service
- ✅ Delete Service
- ✅ Get Services by Artist (Public)

---

### 🖼️ **Portfolio APIs** (Already in Artist Folder)

- ✅ Upload Portfolio Images
- ✅ Get Portfolio Images
- ✅ Get My Portfolio (Protected)
- ✅ Delete Portfolio Image

---

## 📁 Postman Collection Organization

All artist APIs are now organized in a **"Artist"** folder with subfolders:

```
Glamhub API - Production
├── Health Check
├── Auth
├── OTP
└── Artist
    ├── Dashboard
    │   └── Get Dashboard Stats
    ├── Appointments
    │   ├── Get All Appointments
    │   ├── Get Single Appointment
    │   └── Update Appointment Status
    ├── Payments
    │   ├── Get Payment Stats
    │   ├── Get All Transactions
    │   └── Request Withdrawal
    ├── Reviews
    │   ├── Get Reviews
    │   └── Get Single Review
    ├── Services
    │   └── (All service endpoints)
    └── Portfolio
        └── (All portfolio endpoints)
```

---

## 🔒 Access Control

All artist dashboard APIs require:
- ✅ Authentication (Bearer token)
- ✅ Artist role verification
- ✅ Ownership checks (where applicable)

---

## 📊 Models Created

### 1. **Appointment Model**
- Artist and Client references
- Service reference
- Date, time, location
- Multiple services support
- Status tracking
- Cancellation details

### 2. **Transaction Model**
- Deposit/Withdrawal/Refund types
- Status tracking (pending, succeeded, failed, in_transit)
- Bank details for withdrawals
- Client and Appointment references

### 3. **Review Model**
- Rating (1-5)
- Category ratings (professionalism, communication, punctuality, value)
- Comment
- Verification status
- Client and Appointment references

---

## ✅ All Validations Included

- ✅ Request validation (express-validator)
- ✅ Schema validation (Mongoose)
- ✅ Business logic validation
- ✅ Role checks (Artist only)
- ✅ Ownership checks

---

## 🚀 Ready to Use!

All APIs are:
- ✅ Created and tested
- ✅ Fully validated
- ✅ Organized in Postman
- ✅ Documented
- ✅ Ready for frontend integration

**Base URL:** `http://api.adwebtest.online/api`

---

**Last Updated:** January 14, 2026
