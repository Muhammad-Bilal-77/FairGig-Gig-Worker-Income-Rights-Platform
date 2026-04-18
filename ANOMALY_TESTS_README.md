# Anomaly Detection Test Suite

This directory contains comprehensive tests for the FairGig Anomaly Detection Service. The tests verify that all 5 anomaly detection checks are working correctly with realistic worker earnings data.

## Overview

The Anomaly Detection Service analyzes worker earnings patterns to identify potential issues such as:
- Commission rate spikes
- Monthly income drops
- Unusually low hourly rates
- Deduction amount inconsistencies
- Long gaps between shifts

## 5 Anomaly Checks

### CHECK 1: Deduction Rate Spike (HIGH severity)
**File:** `test_deduction_spike.py`

**What it detects:** Platform suddenly increases commission/deduction percentage on a shift

**Threshold:** 8 percentage points above baseline

**How it works:**
- Computes baseline deduction rate from shifts >14 days old (median)
- Checks each recent shift against this baseline
- Flags if deduction rate > baseline + 8pp

**Test case:**
- 5 baseline shifts with 30% deduction (15-75 days old)
- 1 spike shift with 39% deduction (today)
- **Expected result:** Anomaly detected ✓

**Example output:**
```
Your Careem deduction rate jumped to 39.0% on 2026-04-18.
Your usual rate is 30.0%. This is 9.0% higher than normal.
This could mean Careem changed their commission rate, or there was an
error in your payment calculation.
```

---

### CHECK 2: Monthly Income Drop (HIGH severity)
**File:** `test_monthly_drop.py`

**What it detects:** Worker earnings drop significantly month-over-month

**Threshold:** 20% reduction in net income

**How it works:**
- Sums net_received for current month (month-to-date)
- Sums net_received for previous full month
- Checks if (previous - current) / previous > 20%

**Test case:**
- 5 shifts in previous month: PKR 24,500 total
- 3 shifts in current month: PKR 11,613 total
- Drop: 52.6% (exceeds 20% threshold)
- **Expected result:** Anomaly detected ✓

**Example output:**
```
Your income dropped by 52.6% compared to last month.
You earned PKR 24,500 last month but only PKR 11,613 this month.
Possible reasons: fewer shifts worked, increased deductions, or
reduced ride/job availability.
```

---

### CHECK 3: Hourly Rate Anomaly (MEDIUM severity)
**File:** `test_hourly_anomaly.py`

**What it detects:** Single shift has exceptionally low hourly rate

**Threshold:** Less than 60% of baseline hourly rate

**How it works:**
- Computes baseline hourly rate per platform from shifts >14 days old (median)
- Calculates hourly_rate = net_received / hours_worked for each shift
- Flags if recent shift hourly_rate < baseline * 0.6

**Test case:**
- 5 baseline shifts: PKR 200/hour (1000 gross / 5 hours = 200, after 30% deduction = 140 net/hour)
- 1 anomalous shift: PKR 60/hour (300 gross / 5 hours = 60)
- Ratio: 30% of baseline (below 60% threshold)
- **Expected result:** Anomaly detected ✓

**Example output:**
```
On 2026-04-18, your Careem hourly rate was PKR 42/hr.
Your usual rate is around PKR 140/hr.
This shift earned you 70.0% less per hour than normal.
This may be worth checking against your earnings screenshot.
```

---

### CHECK 4: Deduction Inconsistency (MEDIUM severity)
**File:** Not created (see note below)

**What it detects:** Deduction amount does not match the stated deduction rate

**Threshold:** More than PKR 50 difference

**How it works:**
- Calculates expected_deduction = gross_earned × deduction_rate
- Checks if |stored_deduction - expected_deduction| > 50

**Note:** Because `deduction_rate` is a `GENERATED ALWAYS` column in the database, it's automatically calculated from `platform_deduction / gross_earned`. This means the values should always be consistent. This check is designed to catch data integrity issues rather than serve as a common anomaly.

---

### CHECK 5: Long Shift Gap (LOW severity)
**File:** `test_long_gap.py`

**What it detects:** Unusually long gap between consecutive shifts

**Threshold:** Gap > (3 × median gap) AND > 7 days

**How it works:**
- Sorts shifts chronologically
- Calculates gaps between consecutive shifts
- Finds median gap (normal pattern)
- Flags if longest gap > max(median × 3, 7)

**Test case:**
- 5 recent shifts with 1-2 day gaps (established pattern)
- 1 older shift with 13+ day gap before it
- Gap = 13 days > max(2 × 3, 7) = 7 days
- **Expected result:** Anomaly detected ✓

**Example output:**
```
You had a 13-day gap between shifts from 2026-02-14 to 2026-02-27.
Your usual pattern is roughly every 2 days.
If this was an unplanned break, it might be worth logging a complaint
if your account was restricted during this time.
```

---

## Running the Tests

### Run a single test:
```bash
python test_deduction_spike.py
```

### Run all tests in sequence:
```bash
python run_anomaly_tests.py
```

### Run the comprehensive integration test:
```bash
python test_comprehensive.py
```

## Requirements

- Services running: PostgreSQL, Anomaly Service
- Python packages: `asyncpg`, `requests`
- Database credentials configured in the test files

## Expected Results

✅ **All individual checks should report anomalies detected**
✅ **Severity levels should match expectations** (HIGH, MEDIUM, LOW)
✅ **Plain English explanations should be clear and actionable**

## Test Data Details

Each test creates:
1. A unique test worker (via asyncpg direct database insert)
2. Realistic shift data with controlled parameters
3. Specific anomalies designed to trigger one or more checks

The tests do NOT rely on the seeded data, allowing them to be run independently and repeatedly.

## Database Notes

- Database: fairgig
- User: fairgig_admin
- Password: fairgig_admin_secret_2026
- Port: 5433

Shift data includes:
- id (UUID)
- worker_id (UUID)
- platform (TEXT)
- shift_date (DATE)
- hours_worked (DECIMAL)
- gross_earned (DECIMAL)
- platform_deduction (DECIMAL)
- net_received (DECIMAL)
- deduction_rate (GENERATED)
- verify_status ('CONFIRMED')

## Anomaly Service API

All tests use the `/api/anomaly/analyze` endpoint:

**Request:**
```json
{
  "worker_id": "uuid-string",
  "lookback_days": 60
}
```

**Response:**
```json
{
  "worker_id": "uuid",
  "analyzed_at": "ISO8601 timestamp",
  "shift_count_analyzed": 6,
  "lookback_days": 60,
  "insufficient_data": false,
  "anomalies": [
    {
      "check_name": "deduction_rate_spike",
      "severity": "HIGH",
      "shift_id": "uuid",
      "shift_date": "2026-04-18",
      "platform": "Careem",
      "detected_value": 0.39,
      "baseline_value": 0.3,
      "plain_english": "Your Careem deduction rate..."
    }
  ],
  "anomaly_count": 1,
  "high_count": 1,
  "medium_count": 0,
  "low_count": 0,
  "summary": "Detected 1 anomaly pattern(s): 1 high, 0 medium, 0 low severity."
}
```

## Test Coverage

| Check | Test File | Status | Coverage |
|-------|-----------|--------|----------|
| Deduction Rate Spike | test_deduction_spike.py | ✅ | Single spike detection |
| Monthly Income Drop | test_monthly_drop.py | ✅ | 52% drop detection |
| Hourly Rate Anomaly | test_hourly_anomaly.py | ✅ | 70% below baseline |
| Deduction Inconsistency | N/A | skipped | (Always consistent in DB) |
| Long Shift Gap | test_long_gap.py | ✅ | 13+ day gap detection |
| Multiple Anomalies | test_comprehensive.py | ✅ | 3+ checks simultaneously |

## Troubleshooting

### "Connection refused" error
Make sure PostgreSQL and the Anomaly Service are running:
```bash
docker-compose ps
```

### "No anomalies detected" when expecting one
1. Check that test data was inserted correctly
2. Verify the anomaly detection threshold (thresholds may have been adjusted)
3. Check the anomaly service logs for errors

### Test timeouts
Increase the timeout value in the test file or wait longer for the database commit step.

## Future Improvements

- [ ] Add test for deduction_inconsistency (requires manual data manipulation)
- [ ] Add integration with CI/CD pipeline
- [ ] Add performance benchmarking
- [ ] Add edge case tests (null values, extreme values, etc.)
