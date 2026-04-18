# FairGig API Contracts

## Base URL
All requests go through: `http://localhost:80`

## Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

## Services

### Auth Service (port 4001)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | /api/auth/register | No | - | Register new user |
| POST | /api/auth/login | No | - | Login, get tokens |
| POST | /api/auth/refresh | No | - | Rotate refresh token |
| POST | /api/auth/logout | Yes | any | Logout |
| GET | /api/auth/me | Yes | any | Get current user |

### Earnings Service (port 4002)
*(to be filled in Prompt 3)*

### Anomaly Service (port 4003)
*(to be filled in Prompt 4)*

### Grievance Service (port 4004)
*(to be filled in Prompt 5)*

### Analytics Service (port 4005)
*(to be filled in Prompt 6)*

### Certificate Service (port 4006)
*(to be filled in Prompt 7)*
