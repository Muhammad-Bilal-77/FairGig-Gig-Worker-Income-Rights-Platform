# FairGig Auth Service

The Identity & Access Management (IAM) backbone of the FairGig platform. Built securely on Fastify and PostgreSQL, it handles role-based registration, timing-safe authentication, secure session management, automated SMTP email verifications, and manual human-in-the-loop approvals.

## Table of Contents
1. [Architecture & Security](#architecture--security)
2. [Verification Workflow](#verification-workflow-state-machine)
3. [Environment Configuration](#environment-configuration)
4. [API Reference](#api-reference)
5. [Frontend Integration Guide](#frontend-integration-guide)

---

## Architecture & Security

- **Timing-Safe Login:** Implemented via continuous bcrypt operations, preventing attackers from measuring response delays to deduce registered emails.
- **Account Lockouts:** Built-in rate limiting locks user accounts for 15 minutes after 5 failed login loops.
- **Dual JWTs Setup:**
  - `access_token` (15 minutes expiry) containing the user payload.
  - `refresh_token` (7 days expiry), tracked directly within PostgreSQL using SHA-256 hashes (never stored as raw tokens to prevent DB-leak impact).
- **Session Theft Detection:** Refresh token rotation mechanism aggressively monitors familial tokens. If an attacker reuses a successfully intercepted refresh token, the entire active session family is purged from the database, instantly logging both attacker and victim out.
- **Role-Based Access Control (RBAC):** Built-in middleware enforcing restrictions spanning `worker`, `verifier`, `advocate`, and `admin` roles.

---

## Verification Workflow (State Machine)

To combat Sybil attacks, gig workers must pass a highly regulated 2-step verification pipeline.

1. `PENDING_EMAIL`: The user registers. A secure token link is sent via SMTP to their inbox.
2. `PENDING_MANUAL`: The user clicks the validation link. Their email is verified, entering a queue requiring a manual audit.
3. `APPROVED`: An administrator or platform `verifier` validates the user via internal tooling, elevating their status to `APPROVED`.

*(Note: Users technically receive a JWT prior to manual approval, but the JWT payload strictly indicates their `status: 'PENDING_MANUAL'`, locking their access solely to a waiting screen).*

---

## Environment Configuration

Configuration variables required in the `.env` root.

```ini
# PostgreSQL configurations
AUTH_DB_URL=postgresql://auth_svc:secure_password@localhost:5433/fairgig

# Fastify Configurations
AUTH_PORT=4001
AUTH_LOG_LEVEL=info

# Cryptography Context (Generate unique hashes per deployment)
JWT_ACCESS_SECRET=your_access_secret_hash
JWT_REFRESH_SECRET=your_refresh_secret_hash
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Nodemailer / SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=evolvoria@gmail.com
EMAIL_HOST_PASSWORD=example_app_password
```

---

## API Reference

### Public Authentication Routes

#### 1. `POST /api/auth/register`
Creates a brand new account and triggers the SMTP verification email link generation.
- **Body:**
  ```json
  {
    "email": "user@test.com",
    "password": "SecurePassword1!",
    "full_name": "John Doe",
    "role": "worker",
    "phone": "03001234567",
    "city": "Karachi",
    "city_zone": "DHA",
    "worker_category": "ride_hailing"
  }
  ```
- **Returns:** User Object (201 Created). Does not return tokens immediately. Requires login post-creation.

#### 2. `POST /api/auth/login`
Checks credentials against bcrypt hashes and establishes user sessions.
- **Body:** `{ "email": "...", "password": "..." }`
- **Returns:**
  ```json
  {
    "access_token": "eyJhb...",
    "refresh_token": "eyJhb...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": { ... }
  }
  ```

#### 3. `POST /api/auth/refresh`
Rotates user sessions, granting a new `access_token` and `refresh_token` simultaneously.
- **Body:** `{ "refresh_token": "..." }`
- **Returns:** Rotated `access_token` + `refresh_token` dictionary (200 OK). *(401 if expired or stolen)*.

#### 4. `POST /api/auth/verify-email`
Used strictly when users click the link sent via SMTP. Transitions them to `PENDING_MANUAL`.
- **Body:** `{ "token": "uuid-token" }`
- **Returns:** Success Message (200 OK).

---

### Protected Authentication Routes (Requires Header: `Authorization: Bearer <access_token>`)

#### 5. `GET /api/auth/me`
Fetches real-time status updates strictly mapped to the querying JWT (safe user properties).
- **Returns:** Full safe User Schema (200 OK).

#### 6. `POST /api/auth/logout`
Deletes the specific session family entirely off the PostgreSQL refresh log, causing instant authorization failure elsewhere.
- **Returns:** `{ "message": "Logged out successfully" }` (200 OK).

#### 7. `POST /api/auth/approve`
**Requires `verifier` or `admin` JWT Role Payload!** Upgrades target `verification_status` to `APPROVED`.
- **Body:** `{ "user_id": "target-uuid" }`
- **Returns:** `{ "message": "User approved successfully" }` (200 OK).

---

### Internal Microservice Routes (Not Exposed to Frontend API Gateways)
- **`GET /health`** - Lightweight pulse polling.
- **`GET /internal/health`** - Validates the `pg` database connection statuses.
- **`GET /metrics`** - Scraped by Prometheus, tracks login frequencies/lockouts.
- **`GET /internal/users`** - Searchable list querying all auth instances for other microservices (Querystring supports `?role=worker&limit=10`). 

---

## Frontend Integration Guide

React, Vue, or Next.js implementations should utilize `axios` or native `fetch` utilizing interceptor logic.

### 1. Intercepting Axios for Automated Refresh Sessions
You need to silently manage the dual JWT lifecycle via memory arrays to trap the `401 Unauthorized` token expiry. The frontend should gracefully attempt rotation, and upon failure, eject the user back to the `/login` route.

```javascript
axios.interceptors.response.use(
  res => res,
  async err => {
    const originalConfig = err.config;
    if (err.response.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refresh_token: localStorage.getItem('refresh_token')
        });
        
        // Success — Overwrite existing tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        // Replay original request with new Header
        originalConfig.headers.Authorization = `Bearer ${data.access_token}`;
        return axios(originalConfig);
      } catch (_error) {
        // Attack/Expired — Clear DOM Data & Kick to Log in
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(_error);
      }
    }
    return Promise.reject(err);
  }
);
```

### 2. Guarding State via Context API
Parse out the JWT directly relying on local states (`status`), redirecting them appropriately without heavily querying the API. An active JWT contains `status` fields directly:

```javascript
import jwtDecode from 'jwt-decode';

function AuthGuard({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Redirect to="/login" />;

  const payload = jwtDecode(token);

  if (payload.status === 'PENDING_EMAIL') {
    return <EmailCheckInboxScreen />;
  }

  if (payload.status === 'PENDING_MANUAL') {
    return <WaitlistScreen />;
  }

  // They are status === 'APPROVED'
  return children;
}
```

### 3. Implementing the Email Verification Link
When the user clicks the verification link in their email (`http://your-frontend/auth/verify?token=xyz`), the frontend should execute:

```javascript
// On Component Mount:
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

await axios.post('/api/auth/verify-email', { token });
// Show Success -> Inform User they are awaiting Verification Auditor
```
