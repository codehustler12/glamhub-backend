# Glamhub Backend API

Backend API for Glamhub - Makeup and Salon Booking Platform

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env` file

3. Start development server:
```bash
npm run dev
```

4. For production:
```bash
npm start
```

## 📁 Project Structure

```
glamhub/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── controllers/
│   │   └── authController.js  # Auth logic
│   ├── middleware/
│   │   ├── auth.js            # JWT protection
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   └── User.js            # User model
│   ├── routes/
│   │   └── authRoutes.js      # Auth routes
│   ├── utils/
│   │   └── sendToken.js       # Token helper
│   ├── validators/
│   │   └── authValidator.js   # Input validation
│   └── app.js                 # Express app setup
├── server.js                  # Entry point
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 🔗 API Endpoints

### Auth Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/update-profile` | Update profile | Private |
| PUT | `/api/auth/update-password` | Update password | Private |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API status |

## 📝 API Usage Examples

### Register User
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "role": "user"
}
```

### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 🔐 Authentication

Protected routes require a JWT token. Send it in:
- **Header**: `Authorization: Bearer <token>`
- **Cookie**: Automatically set on login

## 👥 User Roles
- `user` - Regular customer
- `artist` - Makeup artist/Salon professional
- `admin` - Administrator

## 🛠️ Environment Variables

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/glamhub
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
FRONTEND_URL=http://localhost:3000
```

