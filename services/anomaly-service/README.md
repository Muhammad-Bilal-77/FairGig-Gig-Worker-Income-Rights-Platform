# Anomaly Detection Service

Detects anomalies in gig worker earnings patterns using sophisticated statistical analysis.
Analyzes 5 different anomaly types: deduction spikes, income drops, rate anomalies, deduction inconsistencies, and unusual shift gaps.

## 🔍 What This Service Does

The Anomaly Service monitors worker earnings for suspicious or unusual patterns that might indicate:
- Platform changes to commission/deduction rates
- Payment calculation errors
- Unusual work patterns or gaps
- Income fluctuations

All detections are explained in **plain English** suitable for workers to understand.

---

## 📊 The 5 Anomaly Checks

### ✅ CHECK 1: Deduction Rate Spike (HIGH severity)

**What it detects:** Platform suddenly increases commission/deduction percentage on a single shift

**When it triggers:** Deduction rate > 8 percentage points above platform baseline

**Why it matters:** 
- Platform changed their commission rate
- Payment calculation error
- Special fare/promotion with different terms

**Example plain English:**
> "Your Careem deduction rate jumped to 45.0% on 2026-04-10. Your usual rate is 28.0%. 
> This is 17.0% higher than normal. This could mean Careem changed their commission rate, 
> or there was an error in your payment calculation."

---

### ✅ CHECK 2: Monthly Income Drop (HIGH severity)

**What it detects:** Worker earnings drop significantly month-over-month

**When it triggers:** Net income drops > 20% compared to previous month

**Why it matters:**
- Job availability decreased
- Increased deductions
- Fewer shifts worked
- Account restrictions

**Example plain English:**
> "Your income dropped by 23.5% compared to last month. You earned PKR 45,000 last month 
> but only PKR 34,500 this month. Possible reasons: fewer shifts worked, increased deductions, 
> or reduced ride/job availability."

---

### ✅ CHECK 3: Hourly Rate Anomaly (MEDIUM severity)

**What it detects:** Single shift has exceptionally low hourly rate compared to worker's baseline

**When it triggers:** Effective hourly rate < 60% of baseline for that platform

**Why it matters:**
- Unusually low earnings for hours worked
- May indicate surge pricing downturn, traffic, or errors
- Worth verifying against screenshot

**Example plain English:**
> "On 2026-04-09, your Uber hourly rate was PKR 425/hr. Your usual rate is around PKR 750/hr. 
> This shift earned you 43.3% less per hour than normal. This may be worth checking against 
> your earnings screenshot."

---

### ✅ CHECK 4: Deduction Inconsistency (MEDIUM severity)

**What it detects:** Deduction amount doesn't match the stated deduction rate

**When it triggers:** Difference between stored and calculated deduction > PKR 50

**Why it matters:**
- Platform calculation error
- Data entry error
- Rounding inconsistency

**Example plain English:**
> "On 2026-04-08, the deduction amount (PKR 450) does not match the deduction rate shown 
> (30.0% of PKR 1500 = PKR 450). Difference: PKR 75. This could indicate a calculation 
> error in the platform's payment."

---

### ✅ CHECK 5: Long Shift Gap (LOW severity)

**What it detects:** Unusually long gap between consecutive shift dates

**When it triggers:** Longest gap > 3x normal pattern AND > 7 days

**Why it matters:**
- Unplanned break from work
- Account restrictions or bans
- Seasonal pattern changes

**Example plain English:**
> "You had a 28-day gap between shifts from 2026-03-15 to 2026-04-12. Your usual pattern 
> is roughly every 2 days. If this was an unplanned break, it might be worth logging a 
> complaint if your account was restricted during this time."

---

## 🔧 Stack

- Python 3.11+
- FastAPI 0.111.0
- asyncpg 0.29.0 (readonly_svc user only)
- python-jose 3.3.0 (JWT verification)
- numpy 1.26.4 (statistical computation)
- pydantic v2 2.7.1 (data validation)
- prometheus-client 0.20.0 (metrics)
- python-dotenv 1.0.1

---

## 📋 Required .env Variables

Load from repository root `.env`:

- `READONLY_DB_URL`: PostgreSQL connection for readonly_svc user
- `JWT_ACCESS_SECRET`: Secret key for JWT verification
- `ANOMALY_PORT`: Port for service (default 4003)
- `NODE_ENV`: Environment (development or production)

See `.env.example`.

---

## 🚀 Running the Service

### Local Development

```bash
cd services/anomaly-service
pip install -r requirements.txt --break-system-packages
uvicorn src.main:app --reload --port 4003
```

### Docker Compose

```bash
docker compose up -d --build anomaly-service
```

Service will:
- Connect to readonly_svc database pool
- Start listening on port 4003
- Expose Prometheus metrics at `/metrics`

### Health Check

```bash
curl http://localhost:4003/health
```

Response:
```json
{
  "status": "ok",
  "service": "anomaly-service",
  "port": 4003,
  "environment": "development"
}
```

---

## 📡 API Endpoints

### POST /api/anomaly/analyze

Analyze worker for anomalies.

**Auth:** Optional Bearer token (accepts internal calls without token)

**Request:**
```json
{
  "worker_id": "550e8400-e29b-41d4-a716-446655440000",
  "trigger_shift_id": null,
  "lookback_days": 60
}
```

**Response (200):**
```json
{
  "worker_id": "550e8400-...",
  "analyzed_at": "2026-04-18T10:30:00",
  "shift_count_analyzed": 45,
  "lookback_days": 60,
  "insufficient_data": false,
  "anomalies": [
    {
      "check_name": "deduction_rate_spike",
      "severity": "HIGH",
      "shift_id": "550e8400-...",
      "shift_date": "2026-04-10",
      "platform": "Careem",
      "detected_value": 0.45,
      "baseline_value": 0.28,
      "plain_english": "Your Careem deduction rate jumped to 45.0% on 2026-04-10..."
    }
  ],
  "anomaly_count": 1,
  "high_count": 1,
  "medium_count": 0,
  "low_count": 0,
  "summary": "Detected 1 anomaly pattern(s): 1 high, 0 medium, 0 low severity.",
  "methodology": "Analyzed 45 shifts over 60 days. Baseline statistics computed from shifts >14 days old..."
}
```

---

### GET /api/anomaly/worker/{worker_id}

Get anomaly analysis for a specific worker.

**Auth:** Bearer token required
- WORKER can only query their own analysis
- VERIFIER/ADVOCATE can query any worker

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4003/api/anomaly/worker/550e8400-e29b-41d4-a716-446655440000
```

---

### GET /api/anomaly/explain

Get documentation of all anomaly checks.

**Auth:** None required (for judges and documentation)

**Response (200):**
```json
{
  "checks": [
    {
      "name": "deduction_rate_spike",
      "description": "Platform suddenly increases commission/deduction percentage on a shift",
      "threshold": "8 percentage points above baseline",
      "severity": "HIGH",
      "data_required": "At least 5 confirmed shifts older than 14 days for baseline"
    },
    {
      "name": "monthly_income_drop",
      "description": "Worker earnings drop significantly month-over-month",
      "threshold": "20% reduction in net income compared to previous month",
      "severity": "HIGH",
      "data_required": "Shifts from current month and previous month"
    }
  ]
}
```

---

## 🧪 Testing & Verification

### 1. Check Service Health

```bash
curl http://localhost:4003/health | python3 -m json.tool
```

### 2. View All Checks Documentation

```bash
curl http://localhost:4003/api/anomaly/explain | python3 -m json.tool
```

### 3. Get a Worker ID

```bash
WORKER_ID=$(curl -s "http://localhost:4001/internal/users?role=worker&limit=1" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['users'][0]['id'])")
echo $WORKER_ID
```

### 4. Analyze Without Anomalies

```bash
curl -X POST http://localhost:4003/api/anomaly/analyze \
  -H "Content-Type: application/json" \
  -d "{\"worker_id\":\"$WORKER_ID\",\"lookback_days\":60}" \
  | python3 -m json.tool
```

### 5. Create a Shift with HIGH Deduction Rate (45%)

```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"careem.dha.1@seed.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:4002/api/earnings/shifts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform":"Careem",
    "city_zone":"Karachi-DHA",
    "worker_category":"ride_hailing",
    "shift_date":"2026-04-10",
    "hours_worked":8.0,
    "gross_earned":9600.00,
    "platform_deduction":4320.00,
    "net_received":5280.00
  }'
```

### 6. Detect the Anomaly

```bash
curl -X POST http://localhost:4003/api/anomaly/analyze \
  -H "Content-Type: application/json" \
  -d "{\"worker_id\":\"$WORKER_ID\",\"lookback_days\":60}" \
  | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'✅ Anomalies found: {r[\"anomaly_count\"]}')
for a in r['anomalies']:
    print(f'  [{a[\"severity\"]}] {a[\"check_name\"]}')
    print(f'    📝 {a[\"plain_english\"]}')
print()
print(f'📊 Summary: {r[\"summary\"]}')
"
```

---

## 📈 Prometheus Metrics

Tracked metrics at `/metrics`:

- `anomaly_analyses_total{status}`: Total analyses performed (success, insufficient_data, error)
- `anomalies_detected_total{severity,check_name}`: Total anomalies detected by type and severity
- `anomaly_analysis_duration_seconds{status}`: Time to complete analysis
- `http_request_duration_seconds{method,path,status_code}`: HTTP request latency

---

## ✅ Acceptance Criteria

✅ **All 5 checks implemented** with deterministic logic  
✅ **Plain English explanations** for each anomaly  
✅ **/explain endpoint** documents all checks for judges  
✅ **Anomalies sorted** by severity (HIGH → MEDIUM → LOW)  
✅ **Insufficient data handling** (<5 shifts detected correctly)  
✅ **Optional Bearer token** support  
✅ **Prometheus metrics** instrumentation  
✅ **Database integration** with readonly_svc pool  
✅ **Integration with Auth-Service** JWT verification  
✅ **Docker Compose** ready for orchestration
