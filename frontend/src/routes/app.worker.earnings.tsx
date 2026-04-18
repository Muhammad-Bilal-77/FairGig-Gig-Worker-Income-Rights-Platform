import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, Fragment } from "react";
import { PageContainer, PageHeader } from "@/components/AppShell";
import { TagBadge } from "@/components/TagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS, formatPKR } from "@/lib/mock-data";
import { Upload, FileSpreadsheet, Search, AlertCircle, Loader, Eye, Download, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { uploadToCloudinary, validateImageFile, CloudinaryUploadError } from "@/lib/cloudinary";

export const Route = createFileRoute("/app/worker/earnings")({
  head: () => ({ meta: [{ title: "Earnings — FairGig" }] }),
  component: EarningsPage,
});

interface Shift {
  id: string;
  platform: string;
  shift_date: string;
  hours_worked: number;
  gross_earned: number;
  platform_deduction: number;
  net_received: number;
  verify_status: string;
  screenshot_url?: string;
}

function EarningsPage() {
  // Form state
  const [platform, setPlatform] = useState<string>("");
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [gross, setGross] = useState("");
  const [deductions, setDeductions] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStats, setWeekStats] = useState({
    totalGross: 0,
    totalDeductions: 0,
    totalHours: 0,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  // CSV bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<{ success: number; failed: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Enhanced CSV row state
  const [csvRows, setCsvRows] = useState<Array<{
    index: number;
    data: any;
    isValid: boolean;
    errors: string[];
    correctedData?: any;
    imageUrl?: string;
    uploadingImageIndex?: number;
  }>>([]);
  const [csvRowImages, setCsvRowImages] = useState<Record<number, File>>({});
  const csvRowImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const net = useMemo(() => {
    const g = Number(gross) || 0;
    const d = Number(deductions) || 0;
    return Math.max(0, g - d);
  }, [gross, deductions]);

  // Fetch shifts on mount
  useEffect(() => {
    const token = localStorage.getItem('fairgig.tokens');
    if (!token) {
      console.warn('⚠️ No authentication token found. Please login first.');
      setAuthError(true);
      setError('You must be logged in to access this page. Please login first.');
      return;
    }
    console.log('✅ Auth token found, loading shifts...');
    loadShifts();
  }, []);

  // Calculate week stats
  useEffect(() => {
    if (shifts.length > 0) {
      const stats = shifts.reduce(
        (acc, shift) => ({
          totalGross: acc.totalGross + Number(shift.gross_earned),
          totalDeductions: acc.totalDeductions + Number(shift.platform_deduction),
          totalHours: acc.totalHours + Number(shift.hours_worked),
        }),
        { totalGross: 0, totalDeductions: 0, totalHours: 0 }
      );
      setWeekStats(stats);
    }
  }, [shifts]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('fairgig.tokens');
      console.log('📋 Loading shifts with token:', token ? '✅ present' : '❌ missing');
      
      const response = await api.earnings.listShifts({ limit: 50 });
      console.log('✅ Shifts loaded:', response.data?.length || 0);
      setShifts(response.data || []);
    } catch (err: any) {
      console.error("❌ Failed to load shifts:", err);
      
      if (err.message === 'Authentication required' || err.error === 'Authentication required') {
        setAuthError(true);
        setError('Authentication expired. Please login again.');
      } else if (err.status === 401 || err.status === 403) {
        setAuthError(true);
        setError('You do not have permission to view shifts. Please login as a worker.');
      } else {
        setError("Failed to load earning records");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setScreenshot(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSaveShift = async () => {
    // Check authentication first
    const token = localStorage.getItem('fairgig.tokens');
    if (!token) {
      console.error('❌ No auth token found');
      setAuthError(true);
      setError('You must be logged in to save shifts. Please login first.');
      return;
    }
    
    console.log('🔐 Auth token present, proceeding with shift save...');
    
    // Validation
    const errors: string[] = [];
    if (!platform) errors.push("Please select a platform");
    if (!shiftDate) errors.push("Please select a shift date");
    if (!hours || Number(hours) <= 0) errors.push("Please enter hours worked");
    if (!gross || Number(gross) < 0) errors.push("Please enter gross earnings");
    if (deductions && Number(deductions) < 0) errors.push("Deductions cannot be negative");

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      let screenshotUrl: string | undefined;

      // Upload screenshot if provided
      if (screenshot) {
        try {
          screenshotUrl = await uploadToCloudinary(screenshot, setUploadProgress);
        } catch (uploadErr) {
          if (uploadErr instanceof CloudinaryUploadError) {
            throw new Error(uploadErr.message);
          }
          throw uploadErr;
        }
      }

      // Create shift
      const shiftPayload = {
        platform,
        city_zone: "Karachi", // This could be dynamically set from user profile
        worker_category: "food_delivery", // This could be dynamically set from user profile
        shift_date: shiftDate,
        hours_worked: Number(hours),
        gross_earned: Number(gross),
        platform_deduction: Number(deductions) || 0,
        net_received: net,
        screenshot_url: screenshotUrl,
      };

      const response = await api.earnings.createShift(shiftPayload);
      console.log('✅ Shift created successfully:', response);

      if (response.success) {
        // Add new shift to the list
        setShifts([response.data, ...shifts]);

        // Reset form
        setPlatform("");
        setShiftDate(new Date().toISOString().slice(0, 10));
        setHours("");
        setGross("");
        setDeductions("");
        setScreenshot(null);
        setScreenshotPreview(null);
        setUploadProgress(0);

        setSuccessMessage("Shift saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('❌ Error saving shift:', err);
      
      if (err.message === 'Authentication required' || err.error === 'Authentication required' || err.status === 401) {
        setAuthError(true);
        setError('Authentication failed. Please login again and try again.');
      } else if (err.status === 403) {
        setError('You do not have permission to create shifts. Please login as a worker.');
      } else {
        setError(err instanceof Error ? err.message : "Failed to save shift");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Validate a single CSV row
  const validateCsvRow = (row: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required fields
    if (!row.platform || row.platform.trim() === '') {
      errors.push('Platform is required');
    }

    if (!row.city_zone || row.city_zone.trim() === '') {
      errors.push('City/Zone is required');
    }

    if (!row.worker_category || row.worker_category.trim() === '') {
      errors.push('Worker Category is required');
    }

    if (!row.shift_date || row.shift_date.trim() === '') {
      errors.push('Shift Date is required');
    } else {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.shift_date)) {
        errors.push('Date must be in YYYY-MM-DD format');
      }
    }

    if (!row.hours_worked || row.hours_worked.trim() === '') {
      errors.push('Hours worked is required');
    } else {
      const hours = parseFloat(row.hours_worked);
      if (isNaN(hours) || hours < 0) {
        errors.push('Hours must be a valid positive number');
      }
    }

    if (!row.gross_earned || row.gross_earned.trim() === '') {
      errors.push('Gross earned is required');
    } else {
      const gross = parseFloat(row.gross_earned);
      if (isNaN(gross) || gross < 0) {
        errors.push('Gross must be a valid positive number');
      }
    }

    if (!row.platform_deduction || row.platform_deduction.trim() === '') {
      errors.push('Platform deduction is required');
    } else {
      const deduction = parseFloat(row.platform_deduction);
      if (isNaN(deduction) || deduction < 0) {
        errors.push('Deduction must be a valid positive number');
      }
    }

    if (!row.net_received || row.net_received.trim() === '') {
      errors.push('Net received is required');
    } else {
      const net = parseFloat(row.net_received);
      if (isNaN(net) || net < 0) {
        errors.push('Net must be a valid positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Parse CSV file and validate
  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.trim().split('\n');
          if (lines.length < 2) {
            reject(new Error('CSV file must have headers and at least one data row'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const expectedHeaders = [
            'platform',
            'city_zone',
            'worker_category',
            'shift_date',
            'hours_worked',
            'gross_earned',
            'platform_deduction',
            'net_received',
          ];

          const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required headers: ${missingHeaders.join(', ')}`));
            return;
          }

          const rows = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            rows.push(row);
          }

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCsvFileSelect = async (file: File) => {
    setCsvErrors([]);
    setCsvRows([]);

    if (!file.name.endsWith('.csv')) {
      setCsvErrors(['Please select a CSV file']);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCsvErrors(['File size must be less than 2MB']);
      return;
    }

    try {
      console.log('📄 Parsing CSV file:', file.name);
      const rows = await parseCSV(file);

      if (rows.length === 0) {
        setCsvErrors(['CSV file has no data rows']);
        return;
      }

      if (rows.length > 500) {
        setCsvErrors(['CSV file has too many rows (max 500)']);
        return;
      }

      console.log(`✅ CSV parsed successfully: ${rows.length} rows`);
      setCsvFile(file);

      // Validate each row
      const validatedRows = rows.map((row, index) => {
        const validation = validateCsvRow(row);
        return {
          index,
          data: row,
          isValid: validation.isValid,
          errors: validation.errors,
          correctedData: validation.isValid ? row : { ...row },
        };
      });

      setCsvRows(validatedRows);
      setCsvPreview(rows); // Keep for compatibility
    } catch (err: any) {
      console.error('❌ CSV parse error:', err);
      setCsvErrors([err.message || 'Failed to parse CSV']);
    }
  };

  // Handle image upload for a specific row
  const handleCsvRowImageUpload = async (rowIndex: number, file: File) => {
    try {
      validateImageFile(file);
      
      // Find the row and update it to uploading state
      setCsvRows(prevRows =>
        prevRows.map(r => 
          r.index === rowIndex ? { ...r, uploadingImageIndex: rowIndex } : r
        )
      );

      const url = await uploadToCloudinary(file, (progress) => {
        console.log(`📸 Image upload progress (row ${rowIndex}): ${progress}%`);
      });

      // Update row with image URL
      setCsvRows(prevRows =>
        prevRows.map(r => 
          r.index === rowIndex ? { ...r, imageUrl: url, uploadingImageIndex: undefined } : r
        )
      );

      setCsvRowImages(prev => ({ ...prev, [rowIndex]: file }));
      console.log(`✅ Image uploaded for row ${rowIndex}:`, url);
    } catch (err: any) {
      console.error(`❌ Image upload error for row ${rowIndex}:`, err);
      setCsvErrors([`Image upload failed for row ${rowIndex}: ${err.message}`]);
      setCsvRows(prevRows =>
        prevRows.map(r => 
          r.index === rowIndex ? { ...r, uploadingImageIndex: undefined } : r
        )
      );
    }
  };

  // Update a corrected row value
  const updateCsvRowField = (rowIndex: number, field: string, value: string) => {
    setCsvRows(prevRows =>
      prevRows.map(r => {
        if (r.index === rowIndex) {
          const correctedData = { ...r.data, ...r.correctedData, [field]: value };
          const validation = validateCsvRow(correctedData);
          return {
            ...r,
            correctedData,
            isValid: validation.isValid,
            errors: validation.errors,
          };
        }
        return r;
      })
    );
  };

  const handleCsvUpload = async () => {
    if (csvRows.length === 0) {
      setCsvErrors(['No rows to upload']);
      return;
    }

    // Check if there are any valid rows to upload
    const validRows = csvRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setCsvErrors(['No valid rows to upload. Please correct the errors in invalid rows.']);
      return;
    }

    const token = localStorage.getItem('fairgig.tokens');
    if (!token) {
      setCsvErrors(['You must be logged in to upload shifts']);
      return;
    }

    try {
      setIsCsvUploading(true);
      setCsvErrors([]);
      console.log('📤 Uploading shifts...');

      let successCount = 0;
      const newErrors: string[] = [];

      // Upload each valid row individually to handle images
      for (const row of validRows) {
        try {
          const shiftData = {
            platform: row.correctedData.platform || row.data.platform,
            city_zone: row.correctedData.city_zone || row.data.city_zone,
            worker_category: row.correctedData.worker_category || row.data.worker_category,
            shift_date: row.correctedData.shift_date || row.data.shift_date,
            hours_worked: parseFloat(row.correctedData.hours_worked || row.data.hours_worked),
            gross_earned: parseFloat(row.correctedData.gross_earned || row.data.gross_earned),
            platform_deduction: parseFloat(row.correctedData.platform_deduction || row.data.platform_deduction),
            net_received: parseFloat(row.correctedData.net_received || row.data.net_received),
            screenshot_url: row.imageUrl,
          };

          await api.earnings.createShift(shiftData);
          successCount++;
        } catch (err: any) {
          newErrors.push(`Row ${row.index + 1}: ${err.message}`);
        }
      }

      console.log(`✅ Uploaded ${successCount} shifts successfully`);

      setCsvUploadSuccess({
        success: successCount,
        failed: csvRows.length - successCount,
      });

      if (newErrors.length > 0) {
        setCsvErrors(newErrors);
      }

      // Reload shifts
      await loadShifts();

      // Reset after 3 seconds
      setTimeout(() => {
        setCsvFile(null);
        setCsvPreview([]);
        setCsvRows([]);
        setCsvRowImages({});
        setShowBulkUpload(false);
        setCsvUploadSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('❌ CSV upload error:', err);
      setCsvErrors([err.message || 'Failed to upload shifts']);
    } finally {
      setIsCsvUploading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = [
      'platform',
      'city_zone',
      'worker_category',
      'shift_date',
      'hours_worked',
      'gross_earned',
      'platform_deduction',
      'net_received',
    ];

    const sampleRow = [
      'Foodpanda',
      'Karachi',
      'food_delivery',
      '2026-04-18',
      '8',
      '3200',
      '600',
      '2600',
    ];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fairgig-shifts-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filtered = shifts.filter(
    (e) =>
      (status === "all" || e.verify_status.toLowerCase() === status.toLowerCase()) &&
      (search === "" ||
        e.platform.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Earnings"
        description="Log shifts, upload screenshots, and track verification status."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">Log a new shift</h3>
          <p className="text-xs text-muted-foreground">Net pay is calculated automatically.</p>

          {authError && (
            <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm">
              <div className="font-semibold text-destructive mb-2">⚠️ Authentication Required</div>
              <p className="text-destructive/80 mb-3">You must be logged in to use this feature.</p>
              <a href="/login" className="inline-flex items-center justify-center px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Go to Login
              </a>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {authError && (
                  <div className="mt-2">
                    <p className="text-xs text-destructive/80">💡 Tip: Go back to login page and log in, then return here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 flex gap-2 text-sm text-green-700">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2" style={{ opacity: authError ? 0.5 : 1, pointerEvents: authError ? 'none' : 'auto' }}>
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Hours worked</Label>
              <Input
                type="number"
                placeholder="e.g. 8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Gross earnings (PKR)</Label>
              <Input
                type="number"
                placeholder="e.g. 3200"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Deductions (PKR)</Label>
              <Input
                type="number"
                placeholder="commission, fuel, etc."
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Net received</Label>
              <div className="h-9 rounded-md border bg-muted/50 px-3 flex items-center text-sm font-semibold tabular-nums">
                {formatPKR(net)}
              </div>
            </div>
          </div>

          <div className="mt-5" style={{ opacity: authError ? 0.5 : 1, pointerEvents: authError ? 'none' : 'auto' }}>
            <Label>Upload screenshot</Label>
            <div
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                dragActive ? "border-primary bg-primary-soft/40" : "border-border bg-muted/20"
              }`}
            >
              {screenshotPreview ? (
                <>
                  <img src={screenshotPreview} alt="Preview" className="h-24 mx-auto rounded mb-2 object-contain" />
                  <p className="text-sm font-medium">{screenshot?.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change image</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Drop screenshot or click to upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>
            {isUploading && (
              <div className="mt-2 text-xs text-muted-foreground">
                Uploading: {uploadProgress}%
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              onClick={handleSaveShift}
              disabled={isUploading || isLoading || authError}
              className="gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save shift"
              )}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setCsvFile(null);
                setCsvPreview([]);
                setCsvErrors([]);
                setCsvUploadSuccess(null);
                setShowBulkUpload(!showBulkUpload);
              }}
            >
              <FileSpreadsheet className="h-4 w-4" /> Bulk CSV upload
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-elegant">
          <h3 className="font-semibold">This week</h3>
          <p className="text-xs text-muted-foreground">Mon — Sun</p>
          <div className="mt-4 space-y-3">
            <Row label="Total gross" value={formatPKR(weekStats.totalGross)} />
            <Row label="Deductions" value={`- ${formatPKR(weekStats.totalDeductions)}`} />
            <div className="border-t pt-3">
              <Row
                label="Net received"
                value={formatPKR(weekStats.totalGross - weekStats.totalDeductions)}
                bold
              />
            </div>
            <Row label="Hours logged" value={`${weekStats.totalHours.toFixed(1)} h`} />
            <Row
              label="Effective rate"
              value={
                weekStats.totalHours > 0
                  ? `${formatPKR(Math.round((weekStats.totalGross - weekStats.totalDeductions) / weekStats.totalHours))}/h`
                  : "—"
              }
            />
          </div>
          {weekStats.totalGross > 0 && (
            <div className="mt-5 rounded-lg bg-warning-soft/60 border border-warning/30 p-3 text-xs">
              <span className="font-medium">Tip: </span>
              You logged {shifts.length} shifts this week with {weekStats.totalHours.toFixed(1)} hours.
            </div>
          )}
        </div>
      </div>

      {/* Bulk CSV Upload Section */}
      {showBulkUpload && (
        <div className="mt-8 rounded-xl border bg-card shadow-elegant p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Bulk Upload Shifts</h3>
              <p className="text-xs text-muted-foreground">Upload multiple shifts at once via CSV file</p>
            </div>
            <button
              onClick={() => setShowBulkUpload(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {csvUploadSuccess ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
              <div className="text-sm">
                <p className="font-semibold text-green-700 mb-2">✅ Upload Completed!</p>
                <p className="text-green-700">
                  Successfully imported <strong>{csvUploadSuccess.success}</strong> shifts
                  {csvUploadSuccess.failed > 0 && ` (${csvUploadSuccess.failed} skipped)`}
                </p>
              </div>
            </div>
          ) : (
            <>
              {csvErrors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-sm text-destructive">
                  {csvErrors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}

              <div className="grid gap-4 mb-4">
                <div>
                  <Label className="mb-2 block">1. Download Template (Optional)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCsvTemplate}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" /> Download CSV Template
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Required columns: platform, city_zone, worker_category, shift_date, hours_worked, gross_earned, platform_deduction, net_received
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">2. Select CSV File</Label>
                  <div
                    onClick={() => csvInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      {csvFile ? csvFile.name : 'Click to select CSV file or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground">Max 500 rows, 2MB file size</p>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleCsvFileSelect(e.target.files[0]);
                        }
                      }}
                      disabled={isCsvUploading}
                    />
                  </div>
                </div>
              </div>

              {csvRows.length > 0 && (
                <div className="mb-4">
                  <Label className="mb-2 block">3. Review & Edit Rows ({csvRows.length} total)</Label>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto border rounded-lg p-3 bg-muted/20">
                    {csvRows.map((row) => (
                      <div key={row.index} className={`border rounded-lg p-3 ${row.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        {/* Row Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Row {row.index + 1}</span>
                          <div className="flex items-center gap-2">
                            {row.isValid ? (
                              <TagBadge label="Valid" className="bg-green-100 text-green-800" />
                            ) : (
                              <TagBadge label="Invalid - Fix Required" className="bg-red-100 text-red-800" />
                            )}
                            {row.imageUrl ? (
                              <TagBadge label="✓ Image" className="bg-blue-100 text-blue-800" />
                            ) : row.isValid ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => csvRowImageInputRefs.current[row.index]?.click()}
                                disabled={row.uploadingImageIndex === row.index || isCsvUploading}
                              >
                                {row.uploadingImageIndex === row.index ? (
                                  <>
                                    <Loader className="h-3 w-3 animate-spin mr-1" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    Add Image
                                  </>
                                )}
                              </Button>
                            ) : null}
                            <input
                              ref={(el) => {
                                if (el) csvRowImageInputRefs.current[row.index] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleCsvRowImageUpload(row.index, file);
                                }
                              }}
                              disabled={isCsvUploading}
                            />
                          </div>
                        </div>

                        {/* Row Data Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                          {Object.entries(row.correctedData || row.data).map(([key, val]) => (
                            <div key={key}>
                              <label className="text-xs font-medium text-muted-foreground">{key}</label>
                              {row.isValid ? (
                                <div className="text-sm py-1 px-2 bg-white rounded border">{String(val)}</div>
                              ) : (
                                <Input
                                  size="sm"
                                  className="text-xs h-7 mt-0.5"
                                  value={String(row.correctedData?.[key] || row.data[key] || '')}
                                  onChange={(e) => updateCsvRowField(row.index, key, e.target.value)}
                                  disabled={isCsvUploading}
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Errors Display */}
                        {!row.isValid && row.errors.length > 0 && (
                          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <ul className="list-disc list-inside">
                              {row.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Valid: {csvRows.filter(r => r.isValid).length} | Invalid: {csvRows.filter(r => !r.isValid).length} | With Images: {csvRows.filter(r => r.imageUrl).length}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCsvUpload}
                  disabled={csvRows.length === 0 || isCsvUploading || csvRows.every(r => !r.isValid)}
                  className="gap-1.5"
                >
                  {isCsvUploading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload {csvRows.filter(r => r.isValid).length} Valid Shifts
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvRows([]);
                    setCsvPreview([]);
                    setCsvErrors([]);
                    setCsvRowImages({});
                  }}
                  disabled={isCsvUploading}
                >
                  Clear
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-8 rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b">
          <div>
            <h3 className="font-semibold">All earnings logs</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search platform or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-56"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="CONFIRMED">Verified</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading shifts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No earning records found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">ID</th>
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Platform</th>
                  <th className="text-right font-medium px-5 py-3">Hours</th>
                  <th className="text-right font-medium px-5 py-3">Gross</th>
                  <th className="text-right font-medium px-5 py-3">Net</th>
                  <th className="text-center font-medium px-5 py-3">Screenshot</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                    <td className="px-5 py-3">
                      {new Date(e.shift_date).toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{e.platform}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{e.hours_worked}h</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatPKR(Number(e.gross_earned))}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatPKR(Number(e.net_received))}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {e.screenshot_url ? (
                        <button
                          onClick={() => setPreviewImage(e.screenshot_url!)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors"
                          title="View screenshot"
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <TagBadge variant={e.verify_status.toLowerCase() as any} dot>
                        {e.verify_status}
                      </TagBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-2xl max-h-[80vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImage} alt="Screenshot preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-base" : ""}`}>{value}</span>
    </div>
  );
}
