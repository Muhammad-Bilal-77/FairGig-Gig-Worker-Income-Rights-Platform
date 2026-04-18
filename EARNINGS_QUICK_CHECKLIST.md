# Quick Setup Checklist - Earnings Page Dynamic

## Pre-Flight Checklist (Do Once)

- [ ] **Cloudinary Preset Created**
  - Go to: https://cloudinary.com/console/settings/upload
  - "Upload presets" → New → Name: `fairgig-shifts`, Type: Unsigned
  
- [ ] **Services Running**
  - [ ] PostgreSQL/Redis: `docker-compose up`
  - [ ] Auth Service: `cd services/auth-service && npm run dev`
  - [ ] Earnings Service: `cd services/earnings-service && python -m uvicorn src.main:app --port 4002 --reload`
  - [ ] Frontend: `cd frontend && npm run dev`

## Testing Flow

### Test 1: Form & Upload
1. Go to Worker Dashboard → Earnings
2. Fill form (Platform, Date, Hours: 8, Gross: 3200, Deductions: 600)
3. Drag image to upload zone
4. Click "Save shift"
5. ✅ Should see success message
6. ✅ Shift should appear in table

### Test 2: Data Persistence
1. Refresh page (Ctrl+Shift+R)
2. ✅ Shift still visible
3. ✅ Week stats still there

### Test 3: Search/Filter
1. In "All earnings logs" section
2. Type platform name in Search
3. ✅ Table filters
4. Change Status dropdown
5. ✅ Filters by status

### Test 4: Multiple Shifts
1. Add 3-4 more shifts with different dates/platforms
2. ✅ Week stats update (total gross, hours, net, effective rate)
3. ✅ All appear in table sorted by newest first

## If Something Breaks

| Issue | Solution |
|-------|----------|
| "Upload preset not found" | Create preset in Cloudinary settings |
| Shifts don't load | Check earnings service running on :4002 |
| "Authentication required" | Login again, refreshes JWT token |
| Form won't submit | Check all fields filled, no validation errors |
| No image preview | Check browser console for file validation errors |

## File Locations

- Core implementation: `frontend/src/routes/app.worker.earnings.tsx`
- API integration: `frontend/src/lib/api-client.ts`
- Image upload: `frontend/src/lib/cloudinary.ts`
- Full guide: `EARNINGS_PAGE_IMPLEMENTATION_GUIDE.md`
- Config: `.env` (already set)

## Key Features to Verify

- [ ] Form validation (required fields, number inputs)
- [ ] Image drag-drop works
- [ ] Image preview shows
- [ ] Upload progress shows
- [ ] Success message appears
- [ ] Shift list updates
- [ ] Search works
- [ ] Status filter works
- [ ] Week stats calculate
- [ ] Refresh data persists

---

**Time to Setup**: ~5-10 minutes (mostly backend startup)
**Time to Test**: ~2-3 minutes to verify
