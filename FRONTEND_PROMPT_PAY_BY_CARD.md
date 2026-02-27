# Frontend prompt: Fix “Pay by card” – booking only after payment

Copy the text below into Cursor (or give it to your frontend dev) in your **frontend** project.

---

## Context for the frontend

### What was the problem?

When the user selected **“Pay by card”** and continued:

1. The frontend called **`POST /api/client/bookings`** with `paymentMethod: "pay_now"`.
2. The backend **created the booking immediately** (201) and returned a Stripe `clientSecret`.
3. The frontend opened the Stripe payment modal.
4. **If the user closed the modal without entering card details (or cancelled)**, the booking was already saved in the database and showed in both **client** and **artist** panels with `paymentStatus: "pending"`. So we had “orphan” bookings that were never paid and cluttered the lists.

So the issue was: **booking was created before payment**, not a bug in the UI itself.

---

### What the backend changed

The backend now supports a **two-phase flow** for “Pay by card” so that **no booking is created until payment has succeeded**:

1. **`POST /api/client/bookings/prepare-payment`**  
   - Same request body as create booking (artistId, serviceIds, appointmentDate, appointmentTime, venue, venueDetails, paymentMethod: "pay_now", notes).  
   - **Does not create a booking.**  
   - Returns: `{ clientSecret, paymentIntentId, totalAmount, currency, stripeConfigured }`.

2. **`POST /api/client/bookings/confirm-payment`**  
   - Call this **only after** the user has successfully completed payment in Stripe (e.g. after `stripe.confirmCardPayment(clientSecret)` resolves successfully).  
   - Body: **same booking payload as prepare-payment** plus **`paymentIntentId`** (from the prepare-payment response).  
   - Backend verifies the payment with Stripe, then **creates the booking** with `paymentStatus: "paid"` and `status: "confirmed"`.  
   - Returns: the created booking. This is the only time a booking appears in the list for “pay by card”.

The old **`POST /api/client/bookings`** with `paymentMethod: "pay_now"` still exists (it creates the booking first, then returns Stripe clientSecret). We should **stop using that for “Pay by card”** and use the new flow instead.

---

### What the frontend needs to change

**Current flow (problematic):**

- User selects “Pay by card” → frontend calls `POST /api/client/bookings` → booking is created → Stripe modal opens → if user closes modal, booking stays as pending in both panels.

**New flow (required for “Pay by card”):**

1. User selects **“Pay by card”** and continues (e.g. clicks “Confirm” or “Continue to payment”).
2. **Do not call `POST /api/client/bookings`.** Instead call **`POST /api/client/bookings/prepare-payment`** with the same payload you would use for create booking (including `paymentMethod: "pay_now"`). Use the same base URL as your other API calls (e.g. `https://api.adwebtest.online/api` or your env `VITE_API_URL` / `NEXT_PUBLIC_API_URL`).
3. From the response, take **`data.clientSecret`** and **`data.paymentIntentId`**. Store the **same booking payload** (and paymentIntentId) in state or a ref so you can use it in step 5.
4. Open your Stripe payment modal / Elements and use **`clientSecret`** to collect and confirm the card (e.g. `stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })` or your existing Stripe confirm flow).
5. **Only if** the Stripe payment succeeds (e.g. `confirmCardPayment` resolves without error):
   - Call **`POST /api/client/bookings/confirm-payment`** with:
     - **`paymentIntentId`** (from step 2 response)
     - The **same** booking fields: `artistId`, `serviceIds`, `appointmentDate`, `appointmentTime`, `venue`, `venueDetails`, `notes` (same object you sent to prepare-payment).
   - On success, show the booking confirmation and update the client’s bookings list (and the artist will see it in their panel via existing APIs).
6. **If the user closes the modal or payment fails:** do nothing else. Do **not** call confirm-payment. No booking is created, so no need to cancel anything.

**“Pay at venue”:**  
Keep using **`POST /api/client/bookings`** with `paymentMethod: "pay_at_venue"` as you do now. No change.

---

### API summary (for reference)

| Action | Method | Endpoint | When |
|--------|--------|----------|------|
| Get Stripe clientSecret (no booking) | POST | `/api/client/bookings/prepare-payment` | When user chooses “Pay by card” and continues |
| Create booking after payment | POST | `/api/client/bookings/confirm-payment` | Only after Stripe payment succeeds |
| Create booking (pay at venue) | POST | `/api/client/bookings` | When user chooses “Pay at venue” |

**prepare-payment request body (same as create booking):**  
`artistId`, `serviceIds`, `appointmentDate`, `appointmentTime`, `venue`, `venueDetails`, `paymentMethod: "pay_now"`, `notes`.

**confirm-payment request body:**  
Same as above **plus** `paymentIntentId` (from prepare-payment response).

---

### Task for the frontend

1. Find where “Pay by card” triggers the booking API (likely the same place that calls `POST .../bookings` with `pay_now`).
2. For “Pay by card” only:
   - Replace that single `POST /bookings` call with:
     - First: `POST /bookings/prepare-payment` (same body).
     - Then: open Stripe with `clientSecret`; on payment success, call `POST /bookings/confirm-payment` with `paymentIntentId` + same booking payload.
   - Do not create a booking before opening Stripe. Do not call confirm-payment if the user did not complete payment.
3. Keep “Pay at venue” flow unchanged: one call to `POST /bookings` with `paymentMethod: "pay_at_venue"`.
4. After confirm-payment succeeds, redirect or update UI the same way you do today after a successful booking (e.g. show success message, go to “My Bookings”, refresh list).

Implement the above so that when a user selects “Pay by card” and then closes the Stripe modal without paying, no booking appears in the client or artist panels.
