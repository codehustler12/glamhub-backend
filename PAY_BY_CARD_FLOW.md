# Pay by card – two-phase flow (no booking until payment succeeds)

To avoid creating a booking when the user closes the Stripe modal without paying, use this flow.

## Backend endpoints

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/api/client/bookings/prepare-payment` | Get Stripe `clientSecret` (no booking created) |
| 2 | (Stripe) | User completes payment in your Stripe Elements / modal | |
| 3 | POST | `/api/client/bookings/confirm-payment` | Verify payment and create booking (only if payment succeeded) |

## 1. Prepare payment (no booking yet)

**Request:** `POST /api/client/bookings/prepare-payment`  
**Headers:** `Authorization: Bearer <client_token>`  
**Body:** Same as create booking, with `paymentMethod: "pay_now"`:

```json
{
  "artistId": "...",
  "serviceIds": ["..."],
  "appointmentDate": "2026-02-27",
  "appointmentTime": "morning (8AM - 12PM)",
  "venue": "artist_studio",
  "venueDetails": {},
  "paymentMethod": "pay_now",
  "notes": "optional"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "totalAmount": 1150,
    "currency": "AED",
    "stripeConfigured": true
  }
}
```

- Store `clientSecret` and `paymentIntentId`, and keep the same booking payload for step 3.
- Show Stripe Elements / modal and use `clientSecret` to confirm the card payment.

## 2. User pays in Stripe

- Use Stripe.js / Elements with `clientSecret` and call `stripe.confirmCardPayment(clientSecret, ...)` (or equivalent).
- On success, proceed to step 3. If the user closes the modal or payment fails, do **not** call confirm-payment; no booking is created.

## 3. Confirm payment and create booking

Call this **only after** Stripe has confirmed the payment (e.g. `confirmCardPayment` resolved successfully).

**Request:** `POST /api/client/bookings/confirm-payment`  
**Headers:** `Authorization: Bearer <client_token>`  
**Body:** Same booking details **plus** `paymentIntentId`:

```json
{
  "paymentIntentId": "pi_xxx",
  "artistId": "...",
  "serviceIds": ["..."],
  "appointmentDate": "2026-02-27",
  "appointmentTime": "morning (8AM - 12PM)",
  "venue": "artist_studio",
  "venueDetails": {},
  "notes": "optional"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Booking confirmed and payment received.",
  "data": {
    "booking": { ... }
  }
}
```

The booking is created with `paymentStatus: "paid"` and `status: "confirmed"`. It will appear in both client and artist panels only after payment succeeds.

## Summary

| Flow | When to use |
|------|------------------|
| **Two-phase (recommended for pay by card)** | 1) `prepare-payment` → 2) User pays in Stripe → 3) `confirm-payment`. No booking if user never pays. |
| **Single call (current)** | `POST /bookings` with `paymentMethod: "pay_now"` still works but creates a booking immediately; if user closes the modal, that booking stays as pending. Frontend can call `PUT /bookings/:id/cancel` when the user abandons the modal to clean it up. |

For “Pay at venue”, keep using `POST /api/client/bookings` with `paymentMethod: "pay_at_venue"` (booking is created in one step).
