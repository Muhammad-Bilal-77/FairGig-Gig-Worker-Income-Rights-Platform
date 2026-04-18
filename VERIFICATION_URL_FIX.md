# Email Verification URL Fix - Complete Summary

## Issues Fixed

### 1. **Hardcoded Frontend URL in Verification Email**
**Problem**: Verification emails used hardcoded `localhost:3000`, but frontend runs on port `8081` (or `5173`)
**Solution**: 
- Added `FRONTEND_URL` configuration to auth service config
- Updated email template to use configurable URL
- Added environment variable `FRONTEND_URL` to docker-compose

**File Changes**:
- `services/auth-service/src/config.js` - Added `frontend.baseUrl` config
- `services/auth-service/src/utils/mailer.js` - Updated to use `config.frontend.baseUrl`
- `docker-compose.yml` - Added `FRONTEND_URL` env var (defaults to `http://localhost:5173`)

### 2. **Verification Email Route Mismatch**
**Problem**: Email linked to `/auth/verify?token=XXX&email=YYY` but frontend route is `/verify-email?token=XXX`
**Solution**:
- Updated email link to use correct frontend route: `/verify-email?token=XXX`
- Removed unnecessary `email` query parameter (not needed)

**File Changes**:
- `services/auth-service/src/utils/mailer.js`

### 3. **Missing Profile API Endpoints**
**Problem**: `api-client.ts` referenced `/api/auth/profile` but auth service only had `/api/auth/me`
**Solution**:
- Updated API client to use correct `/api/auth/me` endpoint
- Added `/api/auth/profile` GET endpoint as alias for `/me`
- Added `/api/auth/me` PUT endpoint for profile updates

**File Changes**:
- `services/auth-service/src/routes/auth.routes.js` - Added profile endpoints
- `frontend/src/lib/api-client.ts` - Updated endpoints to use `/me`
- `services/auth-service/src/routes/auth.routes.js` - Imported config

## API Endpoints

### Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout (protected)
POST /api/auth/refresh
```

### Email Verification

```
POST /api/auth/verify-email
  Body: { token }
  Response: { message }
```

### User Profile (Protected)

```
GET /api/auth/me
  Returns: User object

GET /api/auth/profile
  Returns: User object (alias)

PUT /api/auth/me
  Body: { full_name?, phone?, city?, city_zone?, worker_category? }
  Returns: Updated user object
```

## Environment Variables

### Backend (Auth Service)

```env
# In docker-compose.yml or system env:
FRONTEND_URL=http://localhost:5173    # Points to frontend dev server
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USE_TLS=false
EMAIL_HOST_USER=dev@fairgig.local
EMAIL_HOST_PASSWORD=dev_password
```

### Frontend

```env
# In frontend/.env.local
VITE_API_URL=http://localhost:4001    # Points to auth service
```

## Email Flow (Updated)

1. User signs up on frontend (http://localhost:5173/login)
2. Frontend calls `POST /api/auth/register` to auth service (http://localhost:4001)
3. Backend sends verification email with link:
   ```
   http://localhost:5173/verify-email?token=XXXXX
   ```
4. User clicks link, frontend loads `/verify-email` page
5. Frontend extracts token and calls `POST /api/auth/verify-email`
6. Backend verifies token and updates user status
7. User can now sign in

## Deployment Configuration

### Development
- Frontend: `http://localhost:5173` or `http://localhost:8081`
- Auth Service: `http://localhost:4001`
- Set `FRONTEND_URL=http://localhost:5173` in env

### Staging/Production
- Update `FRONTEND_URL` env var to point to your deployed frontend URL
- Example: `FRONTEND_URL=https://fairgig.com`

## Related Fixes

1. ✅ Auth service config system for frontend URL
2. ✅ Email verification route path fixed
3. ✅ Missing `/profile` endpoint added
4. ✅ PUT `/me` endpoint for profile updates
5. ✅ API client updated to use correct endpoints
6. ✅ Docker compose env vars configured
7. ✅ Frontend `.env.local` configured

## Testing Checklist

- [ ] Sign up with new account
- [ ] Check email for verification link (should use port 5173)
- [ ] Click verification link
- [ ] Email verification page loads and verifies successfully
- [ ] Redirected to login page
- [ ] Can sign in with verified account
- [ ] `/api/auth/me` endpoint returns user data
- [ ] `/api/auth/profile` endpoint works
- [ ] PUT `/api/auth/me` updates profile
