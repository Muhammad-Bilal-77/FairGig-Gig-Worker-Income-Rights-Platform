# Worker Earnings Page - Dynamic Implementation

## ✅ Completed Tasks

### 1. API Client Updates
- Added `EARNINGS_API_BASE` constant pointing to earnings service (port 4002)
- Created `earningsRequest` function to handle earnings service calls
- Added `api.earnings` namespace with methods:
  - `createShift()` - POST new shift with validation
  - `listShifts()` - GET shifts with filtering
  - `getShift()` - GET single shift
  - `updateScreenshot()` - POST screenshot URL  
  - `deleteShift()` - DELETE shift

### 2. Cloudinary Upload Utility
- Created `src/lib/cloudinary.ts` module with:
  - `uploadToCloudinary()` - Uploads file, returns secure URL
  - `validateImageFile()` - Pre-validates file before upload
  - `CloudinaryUploadError` - Custom error class
  - Progress callback support for upload tracking

### 3. Earnings Page Refactored
- Added form state management for all inputs
- Implemented file upload with drag-and-drop
- File preview before upload
- Real-time net earnings calculation
- Error/success messages
- Loading states with spinners
- API integration for shift creation and listing
- Dynamic week stats calculation
- Form validation
- Auto-refresh of shift list after save

## 🔧 Required Setup

### Cloudinary Configuration

1. **Create Unsigned Upload Preset**:
   - Login to your Cloudinary dashboard (dsydephpr)
   - Go to Settings > Upload > Upload Presets
   - Create new preset named `fairgig-shifts`
   - Set type to "Unsigned"
   - Save
   - This allows uploads directly from the frontend

2. **Environment Variables** (already in .env):
   ```
   CLOUDINARY_CLOUD_NAME=dsydephpr
   CLOUDINARY_API_KEY=599124121958712
   CLOUDINARY_API_SECRET=b0qEp2EaBN4vncdHSVrZzZ0ghlM
   ```

3. **Vite Config** (if needed, add to frontend/vite.config.ts):
   ```typescript
   define: {
     'import.meta.env.VITE_EARNINGS_API_URL': JSON.stringify(
       process.env.EARNINGS_API_URL || 'http://localhost:4002'
     ),
   }
   ```

### Backend Requirements

Ensure earnings service:
- [ ] Has database initialized with shifts table
- [ ] POST `/api/earnings/shifts` endpoint working
- [ ] GET `/api/earnings/shifts` endpoint working
- [ ] Auth middleware configured (requires JWT bearer token)
- [ ] CORS enabled for frontend origin

## 🚀 Testing Checklist

1. **Form Submission**:
   - [ ] Fill form with valid data
   - [ ] Upload image via drag-drop
   - [ ] Click "Save shift" returns success
   - [ ] Shift appears in table below

2. **Image Upload**:
   - [ ] Upload image < 5MB
   - [ ] Test with PNG, JPG
   - [ ] Verify Cloudinary URL in response
   - [ ] Screenshot URL saves with shift

3. **Data Display**:
   - [ ] Existing shifts load on page mount
   - [ ] Week stats calculate correctly
   - [ ] Search/filter works on shifts
   - [ ] Status badge shows correct value

4. **Error Handling**:
   - [ ] File size validation shows error
   - [ ] Invalid file type shows error
   - [ ] Network error handled gracefully
   - [ ] Form validation prevents submission

## 📝 Notes

- Currently hardcoded: `city_zone: "Karachi"`, `worker_category: "food_delivery"`
- These should be fetched from user profile or made user-selectable
- Cloudinary folder: `fairgig/shifts` - organizes uploads
- Status values from backend: `PENDING`, `CONFIRMED`, `FLAGGED`, `UNVERIFIABLE`
- Frontend shows weekly stats - could be enhanced for date range filtering
