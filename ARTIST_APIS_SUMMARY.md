# Artist Sign-Up APIs - Complete Summary

## ✅ All APIs Created Successfully!

All required APIs for the complete artist sign-up flow have been created and are ready to use.

---

## 📋 Complete API List

### 1. **Authentication APIs** (Already Existed)
- ✅ `POST /api/auth/register` - Register artist with `role: "artist"`
- ✅ `POST /api/auth/login` - Login
- ✅ `GET /api/auth/me` - Get current user profile
- ✅ `PUT /api/auth/update-profile` - **Updated** to include artist fields

### 2. **OTP APIs** (Already Existed)
- ✅ `POST /api/otp/send-registration-otp` - Send OTP for registration
- ✅ `POST /api/otp/verify-registration-otp` - Verify registration OTP
- ✅ `POST /api/otp/send-email` - Send email OTP (protected)
- ✅ `POST /api/otp/send-phone` - Send phone OTP (protected)
- ✅ `POST /api/otp/verify` - Verify OTP (protected)
- ✅ `POST /api/otp/resend` - Resend OTP (protected)

### 3. **Service APIs** (NEW ✨)
- ✅ `POST /api/services` - Create a new service (Artist only)
- ✅ `GET /api/services` - Get all my services (Artist only)
- ✅ `GET /api/services/:id` - Get a single service
- ✅ `PUT /api/services/:id` - Update a service (Owner only)
- ✅ `DELETE /api/services/:id` - Delete a service (Owner only)
- ✅ `GET /api/services/artist/:artistId` - Get all services by artist (Public)

### 4. **Portfolio APIs** (NEW ✨)
- ✅ `POST /api/portfolio/upload` - Upload portfolio images (Artist only)
- ✅ `GET /api/portfolio` - Get portfolio images (Public with artistId query)
- ✅ `GET /api/portfolio` - Get my portfolio (Protected)
- ✅ `DELETE /api/portfolio/:imageUrl` - Delete portfolio image (Owner only)

---

## 🎯 Artist Sign-Up Flow Coverage

### Step 1: Registration ✅
- **API:** `POST /api/auth/register`
- **Fields:** firstName, lastName, username, email, password, phone, role: "artist", agreeToPrivacyPolicy

### Step 2: OTP Verification ✅
- **APIs:** 
  - `POST /api/otp/send-registration-otp`
  - `POST /api/otp/verify-registration-otp`

### Step 3: General Details (Step 1) ✅
- **API:** `PUT /api/auth/update-profile`
- **New Fields Added:**
  - `city` - Artist's city
  - `description` - Description about work (max 500 chars)
  - `hasStudio` - Boolean (has studio or not)
  - `address` - Studio address

### Step 4: Add Services (Step 2) ✅
- **APIs:**
  - `POST /api/services` - Create service
  - `GET /api/services` - Get all my services
  - `PUT /api/services/:id` - Update service
  - `DELETE /api/services/:id` - Delete service

**Service Fields:**
- `serviceName` - Name of the service
- `serviceDescription` - Description (max 200 chars)
- `serviceType` - Enum: makeup, hair, nail, facial, bridal, party, other
- `priceType` - Enum: fixed, hourly, per_person
- `price` - Price amount
- `currency` - Enum: AED, USD, EUR, INR, PKR
- `duration` - Duration string (e.g., "1h", "2h", "30m")
- `addOns` - Array of add-ons with name and price

### Step 5: Portfolio Images (Step 3) ✅
- **APIs:**
  - `POST /api/portfolio/upload` - Upload images (max 10 at once)
  - `GET /api/portfolio?artistId=xxx` - Get portfolio
  - `DELETE /api/portfolio/:imageUrl` - Delete image

---

## 📦 Models Created

### 1. **User Model** (Updated)
Added artist profile fields:
- `city` - String
- `description` - String (max 500 chars)
- `hasStudio` - Boolean
- `address` - String
- `portfolioImages` - Array of image URLs

### 2. **Service Model** (New)
Complete service schema with:
- Artist reference
- Service details (name, description, type)
- Pricing (type, amount, currency)
- Duration
- Add-ons array
- Active status

---

## 📁 Files Created/Modified

### New Files:
1. `src/models/Service.js` - Service model
2. `src/controllers/serviceController.js` - Service CRUD operations
3. `src/controllers/portfolioController.js` - Portfolio image management
4. `src/routes/serviceRoutes.js` - Service routes
5. `src/routes/portfolioRoutes.js` - Portfolio routes
6. `src/middleware/upload.js` - Multer configuration for file uploads
7. `uploads/portfolio/.gitkeep` - Directory structure
8. `OTP_TESTING_GUIDE.md` - Complete OTP testing guide
9. `ARTIST_APIS_SUMMARY.md` - This file

### Modified Files:
1. `src/models/User.js` - Added artist profile fields
2. `src/controllers/authController.js` - Updated updateProfile to include artist fields
3. `src/app.js` - Added service and portfolio routes, static file serving
4. `glamhub-api-postman.json` - Added all new endpoints
5. `package.json` - Added multer dependency
6. `.gitignore` - Added uploads directory rules

---

## 🚀 How to Use

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Uploads Directory (Already Created)
```bash
mkdir -p uploads/portfolio
```

### 3. Start Server
```bash
npm start
# or for development
npm run dev
```

### 4. Test APIs
- Import `glamhub-api-postman.json` into Postman
- All endpoints are pre-configured
- See `OTP_TESTING_GUIDE.md` for OTP testing instructions

---

## 📝 Example: Complete Artist Sign-Up Flow

### 1. Register Artist
```bash
POST /api/auth/register
{
  "firstName": "Jane",
  "lastName": "Artist",
  "username": "janeartist",
  "email": "jane@artist.com",
  "password": "password123",
  "role": "artist",
  "agreeToPrivacyPolicy": true
}
```

### 2. Send Registration OTP
```bash
POST /api/otp/send-registration-otp
{
  "type": "email",
  "email": "jane@artist.com"
}
```

### 3. Verify OTP
```bash
POST /api/otp/verify-registration-otp
{
  "type": "email",
  "email": "jane@artist.com",
  "otp": "123456",
  "tempId": "FROM_STEP_2"
}
```

### 4. Update Profile (Step 1: General Details)
```bash
PUT /api/auth/update-profile
Authorization: Bearer TOKEN
{
  "city": "Belgrade, Serbia",
  "description": "Professional makeup artist",
  "hasStudio": true,
  "address": "Street, 11, City"
}
```

### 5. Create Service (Step 2: Add Services)
```bash
POST /api/services
Authorization: Bearer TOKEN
{
  "serviceName": "Bridal Makeup",
  "serviceDescription": "Complete bridal package",
  "serviceType": "bridal",
  "priceType": "fixed",
  "price": 2500,
  "currency": "AED",
  "duration": "3h",
  "addOns": [
    {
      "name": "Hair Styling",
      "price": 500
    }
  ]
}
```

### 6. Upload Portfolio Images (Step 3)
```bash
POST /api/portfolio/upload
Authorization: Bearer TOKEN
Content-Type: multipart/form-data
Body: form-data with key "images" and select image files
```

---

## 🔒 Security & Access Control

- **Artist-Only Endpoints:** Services and Portfolio uploads require `role: "artist"`
- **Owner-Only:** Update/Delete operations check ownership
- **Authentication:** All protected routes require JWT token
- **File Upload:** Max 10 images, 5MB per file, images only

---

## 📚 Documentation

- **API Documentation:** `API_DOCUMENTATION.md`
- **OTP Testing Guide:** `OTP_TESTING_GUIDE.md`
- **Postman Collection:** `glamhub-api-postman.json`

---

## ✅ Status: READY FOR FRONTEND INTEGRATION!

All APIs are complete, tested, and ready for your frontend developer to integrate!

**Base URL:** `http://api.adwebtest.online/api`

---

**Last Updated:** January 14, 2026
