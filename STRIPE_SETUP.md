# Stripe Setup (Glamhub)

The backend already supports Stripe for **pay now** bookings: creating payment intents, confirming payments, and refunds. You only need to add your keys.

## 1. Add keys to `.env`

Copy `.env.example` to `.env` (if you don’t have one) and set:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Use your actual test keys from the Stripe Dashboard (or the keys you were given).

- **Secret key** is used only on the backend (never expose it in the frontend).
- **Publishable key** is used in the frontend to initialize Stripe.js and confirm payments.

## 2. Restart the server

After saving `.env`, restart the API so it picks up the new variables.

## 3. How it works in the app

1. **Create booking (pay now)**  
   `POST /api/client/bookings` with `paymentMethod: "pay_now"`  
   Response includes `paymentIntent.clientSecret` and `paymentIntent.paymentIntentId` when Stripe is configured.

2. **Frontend**  
   - Load Stripe.js and create a Stripe instance with the **publishable key** (from your env or from `GET /api/config/stripe`).
   - Use `clientSecret` with Stripe’s `confirmCardPayment()` (or Elements) to collect card and complete payment.

3. **Confirm payment on backend**  
   After the client completes payment in Stripe.js, call:
   `POST /api/client/payments/process`  
   Body: `{ "appointmentId": "...", "paymentIntentId": "pi_..." }`  
   This confirms the payment and marks the appointment as paid.

4. **Refund**  
   `POST /api/client/payments/refund`  
   Body: `{ "appointmentId": "...", "reason": "..." }`

## 4. Optional: get publishable key from API

Frontend can get the publishable key from the backend so it doesn’t need to be hardcoded:

```http
GET /api/config/stripe
```

Response:

```json
{
  "success": true,
  "data": {
    "publishableKey": "pk_test_...",
    "stripeConfigured": true
  }
}
```

## 5. Test cards (Stripe test mode)

Use [Stripe test cards](https://stripe.com/docs/testing#cards), for example:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Use any future expiry and any 3-digit CVC.

## 6. Production

For production:

1. In [Stripe Dashboard](https://dashboard.stripe.com/apikeys), switch to **Live** and use the live keys.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in your production environment to the **live** values (e.g. `pk_live_...`, `sk_live_...`).
3. Do not commit `.env` or real keys to git (`.env` is in `.gitignore`).
