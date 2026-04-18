# Quick Start: Test the Bulk CSV Upload

## Prerequisites
1. ✅ Worker earnings page is open (`/app/worker/earnings`)
2. ✅ Logged in as a worker user
3. ✅ Backend services running (ports 4001, 4002)

---

## Quick Test (2 minutes)

### Step 1: Click "Bulk CSV upload"
```
Expected: Bulk upload section expands
```

### Step 2: Download template
```
Click: "Download CSV Template"
Opens file dialog → fairgig-shifts-template.csv
```

### Step 3: Add data to template
Open the downloaded template in a text editor or Excel and add 2-3 shifts:

```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
Careem,Lahore,ride_hailing,2026-04-19,10,4500,900,3600
```

### Step 4: Select the CSV file
```
Click: File selection area
Select: Your updated CSV file
Expected: Red errors appear (if invalid) OR Green preview appears
```

### Step 5: Upload
```
Click: "Upload N Shifts"
Expected: Button shows spinner for 1-2 seconds
Then: Green success message
```

### Step 6: Verify
```
Check shifts table below
Expected: Your 2-3 new shifts appear with correct data
```

---

## Test Different Scenarios

### ✅ Valid CSV Test
**File: valid-shifts.csv**
```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
Careem,Lahore,ride_hailing,2026-04-19,10,4500,900,3600
Bykea,Islamabad,food_delivery,2026-04-18,6,2400,480,1920
InDrive,Karachi,ride_hailing,2026-04-17,9,3600,720,2880
```
**Expected:** All 4 shifts upload successfully

---

### ❌ Invalid CSV Test 1: Missing Column
**File: invalid-missing-column.csv**
```csv
platform,city_zone,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,2026-04-20,8,3200,600,2600
```
**Expected Error:** 
```
Missing required headers: worker_category
```

---

### ❌ Invalid CSV Test 2: Wrong Column Names
**File: invalid-column-names.csv**
```csv
platform,city,role,date,hours,gross,deduction,net
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600
```
**Expected Error:**
```
Missing required headers: city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received
```

---

### ❌ Invalid CSV Test 3: Empty Rows
**File: invalid-empty-rows.csv**
```csv
platform,city_zone,worker_category,shift_date,hours_worked,gross_earned,platform_deduction,net_received
Foodpanda,Karachi,food_delivery,2026-04-20,8,3200,600,2600


```
**Expected:** Only 1 row imported (empty rows skipped)

---

### ❌ Invalid CSV Test 4: Text File
**File: invalid-text.txt**
```
This is just plain text, not CSV
Random content here
Not valid at all
```
**Expected Error:**
```
Missing required headers: platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received
```

---

## Browser Console Debugging

Open DevTools with **F12** and check the **Console** tab during upload:

### Successful Upload Console Output:
```
📄 Parsing CSV file: fairgig-shifts-template.csv
✅ CSV parsed successfully: 4 rows
📤 Uploading CSV file...
✅ CSV uploaded successfully: {success: true, data: {successful: 4, skipped: 0}}
```

### Failed Upload Console Output:
```
📄 Parsing CSV file: invalid-missing-column.csv
❌ CSV validation error: Missing required headers: worker_category
```

### Upload Error Console Output:
```
❌ CSV upload error: Error: Upload failed
```

---

## Expected Results After Each Upload

| Test | Result | Shifts Added |
|------|--------|-------------|
| Valid CSV (4 rows) | ✅ Success | 4 new shifts |
| Invalid Template | ❌ Error shown | 0 shifts |
| 10 Valid Shifts | ✅ Success | 10 new shifts |
| Empty File | ❌ Error shown | 0 shifts |

---

## Success Indicators

✅ **Form validation works:**
- Invalid CSV blocks upload with clear error
- Valid CSV enables upload button

✅ **Upload succeeds:**
- Success message appears with count
- Green message shows "Imported N shifts"
- Section auto-closes after 3 seconds

✅ **Data saved correctly:**
- Shifts appear in the table below
- All columns populated correctly
- Weekly stats updated

✅ **Error handling works:**
- Clear error messages
- Upload button stays disabled during errors
- Can try again without page refresh

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **CSV won't select** | Check file is .csv format, not .xlsx |
| **Shows red error for valid CSV** | Open in text editor, verify column names match exactly |
| **Upload button stays disabled** | Check browser console for validation errors |
| **Upload fails silently** | Check backend is running: `curl http://localhost:4002/health` |
| **Shifts don't appear after upload** | Refresh page manually, check database directly |

---

## Performance Notes

- **Parsing Speed**: < 500ms for 500 rows
- **Upload Time**: 1-3 seconds depending on network
- **Table Refresh**: Automatic, < 1 second

---

## Feature Checklist

After testing, verify these features work:

- [ ] Download template generates valid CSV with headers + sample
- [ ] File selection triggers CSV parsing
- [ ] Valid CSV shows preview of first 5 rows
- [ ] Invalid CSV shows specific error messages
- [ ] Upload button disabled until CSV is valid
- [ ] Upload shows progress spinner during submission
- [ ] Success message shows count of imported shifts
- [ ] Auto-refresh loads new shifts into table
- [ ] Weekly stats update from new shifts
- [ ] Can upload multiple times without refresh
- [ ] Close (X) button collapses section

---

## Notes

- CSV upload does NOT support image URLs in the file
- Each shift's `verify_status` defaults to "NO_SCREENSHOT"
- Duplicate shifts are allowed (no deduplication)
- Max 500 rows per file (backend enforced)
- Max 2MB file size (backend enforced)

---

**Ready to test!** 🚀

Start with the **Quick Test (2 minutes)** section above to validate the feature works end-to-end.
