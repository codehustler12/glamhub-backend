# Frontend prompt: Stripe Connect — artist payouts & escrow payments

Copy the text below into Cursor (or give it to your frontend dev) in your **frontend** project.

---

## What we are building

GlamHub is adding **Stripe Connect** so artists (vendors) can receive payouts when clients pay online.

**Payment flow (business rules):**

1. Client pays at booking → full amount is collected by GlamHub (held on platform; **not** sent to artist yet).
2. When the appointment is marked **completed** → backend deducts platform commission (default **10%**, configurable) and transfers the rest to the artist’s Stripe account.
3. If the booking is **cancelled or refunded before completion** → no payout to the artist.

**Refund / cancellation rules (backend will enforce):**

| Scenario | Refund |
|----------|--------|
| Artist cancels | Full refund |
| Client cancels ≥ 24 hours before appointment | Full refund |
| Client cancels &lt; 24 hours before appointment | Partial or no refund (percentage TBD by client) |
| Refund request after appointment | Manual review by GlamHub admin |

**Artist onboarding:** Artists must complete a short **Stripe-hosted** onboarding (identity + bank details). We do **not** build those forms — only buttons, status, and redirects.

---

## Backend updates (in progress / planned)

The backend team will add:

### New env config (server-side only)

- `PLATFORM_COMMISSION_PERCENT` (default `10`)
- `CANCELLATION_CUTOFF_HOURS` (default `24`)
- `LATE_CANCELLATION_REFUND_PERCENT` (TBD)

### Database (artist user)

- `stripeAccountId`, `stripeOnboardingComplete`, `stripeChargesEnabled`, `stripePayoutsEnabled`

### Appointment / transaction fields

- `artistPayoutStatus`: `pending` \| `released` \| `not_applicable` \| `refunded`
- `artistPayoutAmount`, `platformCommissionAmount`, `stripeTransferId` (when released)

### New API endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/artist/stripe/connect` | Artist | Create Connect account (if needed) + return Stripe onboarding URL |
| GET | `/api/artist/stripe/status` | Artist | Onboarding & payout readiness |
| POST | `/api/artist/stripe/dashboard-link` | Artist | Optional: URL to Stripe dashboard for bank updates |
| POST | `/api/webhooks/stripe` | Stripe only | Webhook (no frontend) |

### Changes to existing flows

- **Pay by card:** Same two-phase flow as today (`prepare-payment` → Stripe modal → `confirm-payment`). Payment stays on platform until completion. **No frontend change to checkout UI** unless we add commission breakdown.
- **Mark appointment completed:** Existing `PUT /api/artist/appointments/:id/status` with `{ "status": "completed" }` will trigger backend transfer to artist (when `paymentMethod` was `pay_now` and payment succeeded).
- **Cancel booking:** Existing cancel endpoints updated to apply refund rules automatically.
- **Block pay-now** if artist has not finished Stripe onboarding (backend returns error; frontend should prevent/guard earlier).

---

## What the frontend must implement

### 1. Artist — Stripe payout setup (required)

**Where:** Artist dashboard / settings (e.g. “Payments” or “Payout settings”).

**UI elements:**

1. **Status card** — call `GET /api/artist/stripe/status` on load.

   Example response shape (approximate):

   ```json
   {
     "success": true,
     "data": {
       "stripeConfigured": true,
       "hasConnectAccount": true,
       "onboardingComplete": false,
       "chargesEnabled": false,
       "payoutsEnabled": false,
       "requirementsDue": ["external_account"],
       "message": "Complete setup to receive online payments"
     }
   }
   ```

2. **Primary CTA** — “Set up payouts” / “Complete bank setup”
   - Calls `POST /api/artist/stripe/connect` with body:
     ```json
     {
       "returnUrl": "https://your-frontend.com/artist/payouts?stripe=return",
       "refreshUrl": "https://your-frontend.com/artist/payouts?stripe=refresh"
     }
     ```
   - Response includes `url` → **redirect** artist to that URL (`window.location.href = data.url`).
   - Stripe hosts identity/bank forms; artist returns to `returnUrl`.

3. **Return / refresh handling** — on `/artist/payouts?stripe=return` or `refresh`, re-fetch status and show:
   - ✅ Complete — “Payouts active”
   - ⚠️ Incomplete — show CTA again
   - ⏳ Pending verification — “Stripe is reviewing your details”

4. **Optional:** “Manage payout account” → `POST /api/artist/stripe/dashboard-link` → redirect to Stripe.

**Do not build:** Bank account fields, ID upload, tax forms — Stripe handles all of that.

---

### 2. Artist — onboarding gate (required)

Before artist can accept **pay now** bookings (or when listing goes live):

- If `onboardingComplete === false` or `payoutsEnabled === false`:
  - Show banner: “Complete payout setup to receive online payments.”
  - Link to payout settings screen.
- Optional: disable “Accept online payments” toggle until ready.

Backend will also reject pay-now bookings for non-onboarded artists; frontend should surface this gracefully on client booking if needed.

---

### 3. Artist — appointment list / detail (small update)

For `pay_now` + `paymentStatus: "paid"` appointments, show payout state:

| `artistPayoutStatus` | Show |
|----------------------|------|
| `pending` | “Payment held until appointment is completed” |
| `released` | “Paid out: AED X” (use `artistPayoutAmount` if returned) |
| `not_applicable` | Pay at venue — hide payout row |
| `refunded` | “Refunded — no payout” |

**Mark as completed:** Keep using existing:

```
PUT /api/artist/appointments/:id/status
Authorization: Bearer <artist_token>
Body: { "status": "completed" }
```

Backend triggers Stripe transfer after success. Show loading/success toast; if transfer fails, show API error message.

---

### 4. Client — booking / pay by card (minor updates)

**Keep existing pay-by-card flow** (see `FRONTEND_PROMPT_PAY_BY_CARD.md`):

1. `POST /api/client/bookings/prepare-payment`
2. Stripe `confirmCardPayment(clientSecret)`
3. `POST /api/client/bookings/confirm-payment`

**Add:**

- If prepare-payment or confirm-payment returns error like artist not onboarded:
  - Show: “This artist is not accepting online payments yet. Choose pay at venue or another artist.”
- Optional: on artist public profile, badge “Accepts online payment” only if backend exposes `payoutsEnabled` on artist profile (may be added to `GET /api/public/artists/:id` later).

**No change** to Stripe Elements / modal integration if already working.

---

### 5. Client — cancel booking (update messaging)

Keep existing:

```
PUT /api/client/bookings/:id/cancel
```

Backend will apply 24-hour rule and refund amount. Frontend should:

- Show cancellation policy before confirm (copy from product):
  - Full refund if cancelled 24+ hours before appointment
  - Limited/no refund within 24 hours
- Display refund result from API response (e.g. `refundAmount`, `refundPercent`) when returned.

---

### 6. Admin (optional, phase 2)

- List artists with Connect status (incomplete / active).
- Manual post-appointment refund approval UI (when admin APIs are added).

---

## API base URL & auth

Same as existing app:

- Base: e.g. `https://api.adwebtest.online/api` or your `VITE_API_URL` / `NEXT_PUBLIC_API_URL`
- Artist routes: `Authorization: Bearer <token>`
- Stripe publishable key: `GET /api/config/stripe` → `data.publishableKey`

---

## User flows (summary)

```
ARTIST ONBOARDING
Artist → Payout settings → "Set up payouts" → POST /artist/stripe/connect
       → Redirect to Stripe → Complete forms → Return to app
       → GET /artist/stripe/status → "Payouts active"

CLIENT BOOKING (unchanged checkout)
Client → Pay by card → prepare-payment → Stripe modal → confirm-payment
       → Booking confirmed, payment held by GlamHub

PAYOUT
Artist → Marks appointment "completed" → PUT .../status
       → Backend transfers (total - 10%) to artist

CANCEL
Client/Artist cancels → Backend refunds per policy → No artist payout
```

---

## Out of scope for frontend

- Webhook handling (`POST /api/webhooks/stripe`)
- Commission percentage configuration (env / admin only)
- Stripe secret key (backend only)
- Building Stripe onboarding forms

---

## Testing

- Use Stripe **test** keys from `GET /api/config/stripe`.
- Test cards: https://docs.stripe.com/testing#cards
- Connect onboarding: use Stripe test mode; fake bank details in test onboarding.
- Verify: artist without onboarding cannot complete pay-now booking (or sees clear error).

---

## Questions / dependencies

1. **Late cancellation refund %** — pending client decision; backend will use env when set.
2. **Exact return URLs** — frontend must pass real `returnUrl` / `refreshUrl` in connect request.
3. Confirm with backend when new endpoints are deployed before wiring production.

---

*Backend reference: GlamHub repo — Stripe Connect escrow flow, separate charges and transfers.*
