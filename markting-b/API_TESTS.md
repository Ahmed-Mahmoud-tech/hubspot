# Test Scripts for Authentication API

## Prerequisites

1. Install PostgreSQL or use Docker (see main README.md)
2. Update `.env` file with correct database credentials
3. Start the backend server: `pnpm run start:dev`

## Test User Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123"
  }'
```

Expected Response:

```json
{
  "message": "User registered successfully. Please check your email for verification."
}
```

## Test Email Verification

Replace `TOKEN_FROM_EMAIL` with the actual token from the verification email:

```bash
curl -X GET "http://localhost:3000/auth/verify-email?token=TOKEN_FROM_EMAIL"
```

Expected Response:

```json
{
  "message": "Email verified successfully. You can now log in."
}
```

## Test User Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Expected Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "verified": true,
    "created_at": "2025-01-13T..."
  }
}
```

## Test Protected Route (Get Profile)

Replace `YOUR_JWT_TOKEN` with the access_token from login:

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Test Forgot Password

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

## Test Reset Password

Replace `TOKEN_FROM_EMAIL` with the token from the password reset email:

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "password": "newpassword123"
  }'
```

## Error Examples

### Validation Error (Missing fields):

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123"
  }'
```

### Unauthorized (Invalid credentials):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrongpassword"
  }'
```
