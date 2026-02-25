# Twilio Verify for Phone OTP (UAE / international)

Phone OTP can use **Twilio Verify** instead of the Messages API. Verify often works for UAE and other regions where a US Twilio number gets error 21612.

## 1. Twilio Console (one-time)

- **Create a Verify service:** Develop → Verify → Services → Create. Name it (e.g. "My OTP Service"), channel SMS. Copy the **Service SID** (starts with `VA...`).
- **Geo permissions:** Messaging → Settings → Geo Permissions → enable **United Arab Emirates** (and any other countries you need).
- No other Console steps required.

## 2. Backend env (server)

Add to your `.env` on the server:

```env
TWILIO_VERIFY_SERVICE_SID=VA7a565fa7c4d78cda4427919c0c443368
```

Keep your existing `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`. `TWILIO_PHONE_NUMBER` is not used for phone OTP when Verify SID is set.

## 3. Behaviour

- If `TWILIO_VERIFY_SERVICE_SID` is set, all phone OTP (send-phone, verify, resend, registration OTP) uses **Verify** (Twilio sends and checks the code).
- If not set, the app falls back to the **Messages API** (your code generates OTP and sends via `TWILIO_PHONE_NUMBER`).

Restart the API after changing env (`pm2 restart glamhub-api`).
