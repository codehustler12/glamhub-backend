# Booking and Payment APIs Documentation

## Overview
This document describes the booking and payment APIs for clients to book services and process payments using Stripe.

## Setup

### 1. Stripe Configuration

Add your Stripe keys to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx  # Your Stripe publishable key (for frontend)
```

**Get your Stripe keys:**
1. Sign up at https://stripe.com
2. Go to Developers > API keys
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. Copy your **Publishable key** (starts with `pk_test_` for test mode)

**Note:** Use test keys for development, live keys for production.

### 2. Install Dependencies
```bash
npm install stripe
```

## Booking Flow

### Step 1: Create Booking
**POST** `/api/client/bookings`

**Request Body:**
```json
{
  "artistId": "ARTIST_ID_HERE",
  "serviceIds": ["SERVICE_ID_1", "SERVICE_ID_2"],
  "appointmentDate": "2024-02-15",
  "appointmentTime": "morning (8AM - 12PM)",
  "venue": "artist_studio",  // or "client_venue"
  "venueDetails": {
    "venueName": "My Venue",
    "street": "123 Main St",
    "city": "Dubai",
    "state": "Dubai"
  },
  "paymentMethod": "pay_now",  // or "pay_at_venue"
  "notes": "Please arrive 15 minutes early"
}
```

**Response (if paymentMethod is 'pay_now'):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": { ... },
    "paymentIntent": {
      "clientSecret": "pi_xxxxx_secret_xxxxx",
      "paymentIntentId": "pi_xxxxx"
    }
  }
}
```

**Response (if paymentMethod is 'pay_at_venue'):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": { ... }
  }
}
```

### Step 2: Process Payment (if pay_now)
**POST** `/api/client/payments/process`

**Request Body:**
```json
{
  "appointmentId": "APPOINTMENT_ID_HERE",
  "paymentIntentId": "pi_xxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "appointment": { ... },
    "transaction": { ... }
  }
}
```

## Frontend Integration with Stripe

### 1. Install Stripe.js
```html
<script src="https://js.stripe.com/v3/"></script>
```

Or for React/Next.js:
```bash
npm install @stripe/stripe-js
```

### 2. Initialize Stripe
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_xxxxxxxxxxxxx'); // Your publishable key
```

### 3. Create Booking and Handle Payment
```javascript
// Step 1: Create booking
const bookingResponse = await fetch('/api/client/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    artistId: '...',
    serviceIds: ['...'],
    appointmentDate: '2024-02-15',
    appointmentTime: 'morning (8AM - 12PM)',
    paymentMethod: 'pay_now',
    // ... other fields
  })
});

const bookingData = await bookingResponse.json();

// Step 2: If paymentMethod is 'pay_now', process payment
if (bookingData.data.paymentIntent) {
  const { error, paymentIntent } = await stripe.confirmCardPayment(
    bookingData.data.paymentIntent.clientSecret,
    {
      payment_method: {
        card: cardElement, // Your Stripe card element
        billing_details: {
          name: 'Client Name',
        },
      }
    }
  );

  if (error) {
    // Handle error
    console.error(error);
  } else if (paymentIntent.status === 'succeeded') {
    // Step 3: Confirm payment on backend
    const paymentResponse = await fetch('/api/client/payments/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        appointmentId: bookingData.data.booking._id,
        paymentIntentId: paymentIntent.id
      })
    });

    const paymentData = await paymentResponse.json();
    // Payment successful!
  }
}
```

## API Endpoints

### Bookings

#### Create Booking
- **POST** `/api/client/bookings`
- **Auth:** Required (Client only)
- **Description:** Create a new booking with optional payment intent

#### Get My Bookings
- **GET** `/api/client/bookings?status=all&page=1&limit=10`
- **Auth:** Required (Client only)
- **Query Params:**
  - `status`: Filter by status (pending, confirmed, completed, cancelled, rejected, all)
  - `page`: Page number
  - `limit`: Items per page

#### Get Single Booking
- **GET** `/api/client/bookings/:id`
- **Auth:** Required (Client only)
- **Description:** Get detailed information about a specific booking

### Payments

#### Process Payment
- **POST** `/api/client/payments/process`
- **Auth:** Required (Client only)
- **Description:** Process payment for a booking after Stripe confirmation

#### Get Payment Intent Status
- **GET** `/api/client/payments/intent/:paymentIntentId`
- **Auth:** Required (Client only)
- **Description:** Check the status of a payment intent

#### Request Refund
- **POST** `/api/client/payments/refund`
- **Auth:** Required (Client only)
- **Request Body:**
  ```json
  {
    "appointmentId": "APPOINTMENT_ID_HERE",
    "reason": "Cancelled by client"
  }
  ```

## Payment Methods

### Pay at Venue
- Client selects "pay_at_venue"
- Booking is created with `paymentStatus: 'pending'`
- No payment intent is created
- Payment is handled offline

### Pay Now (Card)
- Client selects "pay_now"
- Booking is created with payment intent
- Frontend uses Stripe.js to collect card details
- Payment is processed immediately
- Booking status changes to "confirmed" on successful payment

## Service Fee
A fixed service fee of **AED 150** (or equivalent in booking currency) is automatically added to all bookings. This can be made configurable in the future.

## Currency Support
Supported currencies: AED, USD, EUR, INR, PKR

## Error Handling
All endpoints return standard error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...] // Validation errors if any
}
```

## Testing

### Test Cards (Stripe Test Mode)
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- Use any future expiry date and any CVC

### Test Flow
1. Create a booking with `paymentMethod: "pay_now"`
2. Use test card `4242 4242 4242 4242` in Stripe.js
3. Confirm payment on frontend
4. Process payment on backend
5. Verify booking status is "confirmed" and paymentStatus is "paid"

## Notes
- All bookings start with status "pending"
- Bookings with "pay_now" are auto-confirmed when payment succeeds
- Refunds can only be processed for paid bookings
- Service fee is included in total amount calculation
