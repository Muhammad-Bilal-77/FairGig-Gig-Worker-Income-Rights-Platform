# FairGig Frontend

Modern React + Vite + TanStack Router frontend for FairGig — a verification platform for gig workers in Pakistan.

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Configuration

Create a `.env.local` file in the frontend root:

```env
VITE_API_URL=http://localhost:4001
```

This points to the Auth Service. The frontend will communicate with all backend services through this gateway.

## Architecture

### Authentication Flow

1. **Sign Up** (`/login` tab: "Sign Up")
   - User selects role: Worker, Verifier, or Advocate
   - Provides: full name, email, password (8+ chars, 1 letter, 1 number), phone (optional), city (optional)
   - Backend creates user with `verification_status: PENDING_EMAIL`
   - Sends verification email with token link to `/verify-email?token=XXX`

2. **Email Verification** (`/verify-email?token=XXX`)
   - User clicks link from email
   - Frontend calls `POST /api/auth/verify-email` with token
   - Backend updates user to `verification_status: PENDING_APPROVAL`
   - User can now sign in but has limited access until verifier approves account

3. **Sign In** (`/login` tab: "Sign In")
   - User provides email and password
   - Backend returns JWT tokens (access_token valid 15 min, refresh_token valid 7 days)
   - Frontend stores tokens in localStorage
   - User redirected to role-based home page

4. **Protected Routes**
   - All API calls include `Authorization: Bearer {access_token}` header
   - If token expired, frontend auto-refreshes using `refresh_token`
   - If refresh fails, user logged out

### Key Files

- **`src/lib/auth.ts`** - Auth state management (login, signup, verifyEmail, logout, getUser)
- **`src/lib/api-client.ts`** - HTTP client with JWT token handling and auto-refresh
- **`src/routes/login.tsx`** - Sign in / Sign up page with form validation
- **`src/routes/verify-email.tsx`** - Email verification confirmation page
- **`src/hooks/use-toast.ts`** - Toast notification hook for feedback

## Auth API Endpoints

All endpoints hosted on Auth Service (port 4001):

### Public Endpoints

```
POST /api/auth/register
  Body: { email, password, full_name, role, phone?, city?, city_zone?, worker_category? }
  Response: { message, user }

POST /api/auth/login
  Body: { email, password }
  Response: { access_token, refresh_token, token_type, expires_in, user }

POST /api/auth/verify-email
  Body: { token }
  Response: { message }

POST /api/auth/refresh
  Body: { refresh_token }
  Response: { access_token, refresh_token, expires_in }
```

### Protected Endpoints (require JWT)

```
GET /api/auth/profile
  Headers: { Authorization: Bearer {token} }
  Response: { user }

PUT /api/auth/profile
  Headers: { Authorization: Bearer {token} }
  Body: { full_name?, phone?, city?, city_zone?, worker_category? }
  Response: { user }
```

## User Roles

- **worker** - Gig workers uploading earning records
- **verifier** - Income verification specialists reviewing submissions
- **advocate** - Analysts detecting unfair platform practices

## Password Requirements

- Minimum 8 characters
- Must include at least 1 letter and 1 number
- Example: `SecurePass123`

## Phone Format (Pakistan)

- Format: `03XXXXXXXXX` or `+923XXXXXXXXX`
- Example: `03001234567` or `+923001234567`

## Dev Mode

Port: `5173` (Vite default, may use `8081` if port in use)

