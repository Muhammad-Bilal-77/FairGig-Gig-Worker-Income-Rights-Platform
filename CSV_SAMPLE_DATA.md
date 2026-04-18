# CSV Sample Data - Ready to Use

Copy these CSV files and save them with `.csv` extension to test the bulk upload feature with image uploads and manual corrections.

---

## Sample 1: Valid - 20 Shifts Mixed Platforms

**File name:** `test-large-batch.csv`

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
Foodpanda,Karachi,food_delivery,2026-04-19,7,2800,560,2240
Foodpanda,Karachi,food_delivery,2026-04-18,9,3600,720,2880
Careem,Lahore,ride_hailing,2026-04-20,10,4500,900,3600
Careem,Lahore,ride_hailing,2026-04-19,11,5000,1000,4000
Bykea,Islamabad,food_delivery,2026-04-20,6,2400,480,1920
Bykea,Islamabad,food_delivery,2026-04-19,7,2800,560,2240
InDrive,Karachi,ride_hailing,2026-04-20,9,3600,720,2880
InDrive,Karachi,ride_hailing,2026-04-19,8,3200,640,2560
Foodpanda,Lahore,food_delivery,2026-04-20,7,2800,560,2240
Foodpanda,Lahore,food_delivery,2026-04-19,8,3200,640,2560
Careem,Karachi,ride_hailing,2026-04-20,12,5400,1080,4320
Careem,Karachi,ride_hailing,2026-04-19,10,4500,900,3600
Uber Eats,Islamabad,food_delivery,2026-04-20,6,2400,480,1920
Uber Eats,Islamabad,food_delivery,2026-04-19,8,3200,640,2560
Bykea,Lahore,ride_hailing,2026-04-20,9,3600,720,2880
Bykea,Lahore,ride_hailing,2026-04-19,8,3200,640,2560
Foodpanda,Rawalpindi,food_delivery,2026-04-20,5,2000,400,1600
InDrive,Lahore,ride_hailing,2026-04-20,10,4500,900,3600
Careem,Rawalpindi,ride_hailing,2026-04-20,9,3600,720,2880
```

**Expected Result:** All 20 shifts successfully imported | Users can add images for each row

---

## Sample 2: With Invalid Rows - Mixed Valid & Invalid

**File name:** `test-with-errors.csv`

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
InvalidPlatform,Lahore,ride_hailing,2026-04-20,10,4500,900,3600
,Karachi,food_delivery,2026-04-19,9,3600,720,2880
Careem,Lahore,ride_hailing,2026-04-20,abc,5000,1000,4000
Bykea,Islamabad,,2026-04-20,6,2400,480,1920
InDrive,Karachi,ride_hailing,2026-04-20-invalid,9,3600,720,2880
Foodpanda,Lahore,food_delivery,2026-04-19,8,3200,640,2560
Careem,,ride_hailing,2026-04-20,12,5400,1080,4320
Bykea,Islamabad,food_delivery,2026-04-19,8,,640,2560
Foodpanda,Rawalpindi,food_delivery,2026-04-20,5,2000,400,1600
```

**Expected Result:** 
- Show 3-5 valid rows as green (ready to upload)
- Show 5-7 invalid rows as red with error messages
- Allow manual correction of each invalid row
- Shift corrections shown per-row in editable text fields

---

## Sample 3: Heavy Load - 50 Shifts

**File name:** `test-50-shifts.csv`

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
Foodpanda,Karachi,food_delivery,2026-04-19,7,2800,560,2240
Foodpanda,Karachi,food_delivery,2026-04-18,9,3600,720,2880
Foodpanda,Karachi,food_delivery,2026-04-17,8,3200,640,2560
Foodpanda,Karachi,food_delivery,2026-04-16,7,2800,560,2240
Careem,Lahore,ride_hailing,2026-04-20,10,4500,900,3600
Careem,Lahore,ride_hailing,2026-04-19,11,5000,1000,4000
Careem,Lahore,ride_hailing,2026-04-18,10,4500,900,3600
Careem,Lahore,ride_hailing,2026-04-17,9,4000,800,3200
Careem,Lahore,ride_hailing,2026-04-16,12,5400,1080,4320
Bykea,Islamabad,food_delivery,2026-04-20,6,2400,480,1920
Bykea,Islamabad,food_delivery,2026-04-19,7,2800,560,2240
Bykea,Islamabad,food_delivery,2026-04-18,8,3200,640,2560
Bykea,Islamabad,food_delivery,2026-04-17,6,2400,480,1920
Bykea,Islamabad,food_delivery,2026-04-16,7,2800,560,2240
InDrive,Karachi,ride_hailing,2026-04-20,9,3600,720,2880
InDrive,Karachi,ride_hailing,2026-04-19,8,3200,640,2560
InDrive,Karachi,ride_hailing,2026-04-18,10,4500,900,3600
InDrive,Karachi,ride_hailing,2026-04-17,9,3600,720,2880
InDrive,Karachi,ride_hailing,2026-04-16,8,3200,640,2560
Foodpanda,Lahore,food_delivery,2026-04-20,7,2800,560,2240
Foodpanda,Lahore,food_delivery,2026-04-19,8,3200,640,2560
Foodpanda,Lahore,food_delivery,2026-04-18,6,2400,480,1920
Foodpanda,Lahore,food_delivery,2026-04-17,9,3600,720,2880
Foodpanda,Lahore,food_delivery,2026-04-16,7,2800,560,2240
Careem,Karachi,ride_hailing,2026-04-20,12,5400,1080,4320
Careem,Karachi,ride_hailing,2026-04-19,10,4500,900,3600
Careem,Karachi,ride_hailing,2026-04-18,11,5000,1000,4000
Careem,Karachi,ride_hailing,2026-04-17,10,4500,900,3600
Careem,Karachi,ride_hailing,2026-04-16,9,4000,800,3200
Uber Eats,Islamabad,food_delivery,2026-04-20,6,2400,480,1920
Uber Eats,Islamabad,food_delivery,2026-04-19,8,3200,640,2560
Uber Eats,Islamabad,food_delivery,2026-04-18,7,2800,560,2240
Uber Eats,Islamabad,food_delivery,2026-04-17,6,2400,480,1920
Uber Eats,Islamabad,food_delivery,2026-04-16,8,3200,640,2560
Bykea,Lahore,ride_hailing,2026-04-20,9,3600,720,2880
Bykea,Lahore,ride_hailing,2026-04-19,8,3200,640,2560
Bykea,Lahore,ride_hailing,2026-04-18,10,4500,900,3600
Bykea,Lahore,ride_hailing,2026-04-17,9,3600,720,2880
Bykea,Lahore,ride_hailing,2026-04-16,8,3200,640,2560
Foodpanda,Rawalpindi,food_delivery,2026-04-20,5,2000,400,1600
Foodpanda,Rawalpindi,food_delivery,2026-04-19,6,2400,480,1920
Foodpanda,Rawalpindi,food_delivery,2026-04-18,7,2800,560,2240
Foodpanda,Rawalpindi,food_delivery,2026-04-17,5,2000,400,1600
Foodpanda,Rawalpindi,food_delivery,2026-04-16,6,2400,480,1920
InDrive,Lahore,ride_hailing,2026-04-20,10,4500,900,3600
InDrive,Lahore,ride_hailing,2026-04-19,9,3600,720,2880
InDrive,Lahore,ride_hailing,2026-04-18,11,5000,1000,4000
InDrive,Lahore,ride_hailing,2026-04-17,10,4500,900,3600
InDrive,Lahore,ride_hailing,2026-04-16,9,3600,720,2880
Careem,Rawalpindi,ride_hailing,2026-04-20,9,3600,720,2880
```

**Expected Result:** 
- Scrollable preview showing all 50 rows
- Each row with validation status
- Image upload button for each
- Statistics: Valid: 50 | Invalid: 0 | With Images: 0
- Upload all 50 shifts with images

---

## Sample 4: Test Correction Workflow - Invalid Data to Fix

**File name:** `test-fix-me.csv`

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
FoodPandaa,Lahore,food_delivery,2026-04-20,10,4500,900,3600
Careem,,ride_hailing,2026-04-20,12,5400,1080,4320
Bykea,Islamabad,food_delivery,2026-04-20,typo,2400,480,1920
```

**Expected Workflow:**
1. Upload file → Shows 1 valid (row 1) and 3 invalid rows
2. Click on row 2 → Edit field "platform" from "FoodPandaa" to "Foodpanda" → Status changes to Valid
3. Click on row 3 → Edit field "city_zone" → Type "Islamabad" → Status changes to Valid
4. Click on row 4 → Edit field "hours_worked" → Type "8" → Status changes to Valid
5. All 4 shifts now valid and ready to upload
6. Add images to each row (optional)
7. Hit Upload → All 4 imported successfully

---

## Sample 5: Highest Earnings - Premium Shifts

**File name:** `test-premium-shifts.csv`

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Careem,Lahore,ride_hailing,2026-04-20,12,6000,1200,4800
Careem,Lahore,ride_hailing,2026-04-19,12,6000,1200,4800
Careem,Kachiride_hailing,2026-04-18,12,6000,1200,4800
InDrive,Karachi,ride_hailing,2026-04-20,11,5500,1100,4400
InDrive,Karachi,ride_hailing,2026-04-19,11,5500,1100,4400
Uber Eats,Islamabad,food_delivery,2026-04-20,10,5000,1000,4000
Uber Eats,Islamabad,food_delivery,2026-04-19,10,5000,1000,4000
InDrive,Lahore,ride_hailing,2026-04-20,12,6000,1200,4800
```

**Expected Result:** 8 shifts with high earnings | Easy to verify earnings calculations

---

## How to Use These Samples

1. **Copy the CSV content** from the section above
2. **Open a text editor** (Notepad, VS Code, Sublime, etc.)
3. **Paste the CSV content**
4. **Save as** filename shown (e.g., `test-foodpanda.csv`)
5. **Upload** using the bulk CSV upload feature

---

## Testing Flow

1. **Start with Sample 1** - Valid simple case
2. **Try Sample 2-5** - More valid data variants
3. **Try Sample 6-8** - Invalid headers/columns to test error handling
4. **Try Sample 9-15** - Edge cases

---

## Column Requirements

All these columns must be present (case-insensitive):

| Column | Type | Example |
|--------|------|---------|
| `platform` | string | Foodpanda, Careem, Bykea |
| `city_zone` | string | Karachi, Lahore, Islamabad |
| `worker_category` | string | food_delivery, ride_hailing |
| `shift_date` | date (YYYY-MM-DD) | 2026-04-20 |
| `hours_worked` | number | 8, 10, 7.5 |
| `gross_earned` | number | 3200, 4500, 2400 |
| `platform_deduction` | number | 600, 900, 480 |
| `net_received` | number | 2600, 3600, 1920 |

---

## Quick Copy-Paste

### Fastest test (Valid - 3 rows):
```
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
Foodpanda,Karachi,food_delivery,2026-04-19,7,2800,560,2240
Foodpanda,Karachi,food_delivery,2026-04-18,9,3600,720,2880
```

### Fastest error test (Invalid - Missing column):
```
platform,city_zone,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,2026-04-20,8,3200,600,2600
```

---

**Note:** All dates are in the future (April 2026) to avoid timezone issues. Use today's date or any valid YYYY-MM-DD format.
