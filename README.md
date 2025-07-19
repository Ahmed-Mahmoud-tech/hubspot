# HubSpot Duplicate Management System

A full-stack application that connects to HubSpot CRM, fetches contact data, identifies duplicates, and allows users to manually merge them before syncing changes back to HubSpot.

## Features

- ✅ User Authentication (Registration, Email Verification, Password Reset)
- ✅ HubSpot API Integration (Fetch contacts in batches)
- ✅ Duplicate Detection (Email, Phone, or Name + Company matching)
- ✅ Manual Merge Interface (Card-based UI for conflict resolution)
- ✅ HubSpot Sync (Update/delete records via API)
- ✅ Excel Export (Backup of processed data)
- ✅ Real-time Progress Tracking

## Project Structure

```
markting/
├── markting-b/          # NestJS Backend API
├── markting-f/          # Next.js Frontend
└── docker-compose.yml   # PostgreSQL Database
```

## Setup Instructions

### 1. Database Setup (PostgreSQL)

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Access Adminer (Database GUI) at http://localhost:8080
# Server: postgres
# Username: postgres
# Password: postgres
# Database: hubspot_duplicate_mgmt
```

#### Option B: Local PostgreSQL Installation

1. Install PostgreSQL 15+
2. Create database: `hubspot_duplicate_mgmt`
3. Update `.env` file with your credentials

### 2. Backend Setup (NestJS)

```bash
cd markting-b

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration:
# - Database credentials
# - JWT secret (change in production!)
# - Email SMTP settings (Gmail example provided)

# Start development server
pnpm run start:dev

# API will be available at http://localhost:3000
```

### 3. Frontend Setup (Next.js)

```bash
cd markting-f

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Application will be available at http://localhost:3001
```

## Environment Configuration

### Backend (.env)

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=hubspot_duplicate_mgmt

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Application Configuration
APP_PORT=3000
FRONTEND_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `GET /auth/verify-email?token=xxx` - Verify email
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Send password reset email
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/profile` - Get user profile (protected)

### Duplicate Detection Workflow (Coming Next)

- `POST /jobs/create` - Start new duplicate detection job
- `GET /jobs/status/{job_id}` - Check job progress
- `GET /jobs/contacts` - Paginated fetched contacts
- `GET /jobs/groups` - Paginated duplicate groups
- `POST /jobs/submit-merge` - Submit merged data
- `POST /jobs/finish/{job_id}` - Finalize job

## Database Schema

### Users Table

- `id` (SERIAL PK)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `email` (VARCHAR UNIQUE)
- `phone` (VARCHAR)
- `password` (VARCHAR - hashed)
- `verified` (BOOLEAN)
- `verification_token` (VARCHAR)
- `reset_password_token` (VARCHAR)
- `reset_password_expires` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Actions Table (Job Tracking)

- `id` (SERIAL PK)
- `user_id` (INTEGER FK)
- `name` (VARCHAR)
- `api_key` (VARCHAR - encrypted)
- `count` (INTEGER)
- `status` (ENUM: start → fetching → filtering → manually_merge → update_hubspot → finished)
- `process_name` (VARCHAR)
- `excel_link` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Development Status

### ✅ Completed

- Backend project structure with NestJS
- PostgreSQL database integration with TypeORM
- User authentication system (register, login, verify email, reset password)
- Email service with SMTP support
- JWT-based authentication with Passport
- Input validation with class-validator
- CORS configuration for frontend

### 🚧 In Progress

- Frontend user interface with Next.js
- HubSpot API integration
- Duplicate detection algorithm
- Manual merge interface

### 📋 TODO

- Real-time progress tracking
- Excel export functionality
- Contact management features
- Batch processing optimization

## Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
   - Use this password in `EMAIL_PASSWORD`

## Testing the API

### Register a new user:

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

### Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## Next Steps

1. Start the database: `docker-compose up -d postgres`
2. Start the backend: `cd markting-b && pnpm run start:dev`
3. Test user registration and email verification
4. Build the frontend registration/login forms
5. Implement HubSpot API integration
6. Create duplicate detection algorithms
