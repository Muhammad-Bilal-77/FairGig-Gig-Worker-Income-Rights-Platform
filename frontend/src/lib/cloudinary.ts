/**
 * Cloudinary Upload Utility
 * Handles image uploads for shift screenshots
 */

const CLOUDINARY_CLOUD_NAME = 'dsydephpr';
const CLOUDINARY_UPLOAD_PRESET = 'fairgig-shifts'; // Must be created in Cloudinary dashboard as unsigned preset

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

/**
 * Upload an image file to Cloudinary
 * @param file - The image file to upload
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new CloudinaryUploadError('Please upload an image file (PNG, JPG, etc.)');
  }

  // Validate file size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new CloudinaryUploadError('File size must be less than 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
  formData.append('folder', 'fairgig/shifts'); // Organize uploads in folder

  try {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    return new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } catch {
            reject(new CloudinaryUploadError('Invalid response from Cloudinary'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new CloudinaryUploadError(error.error?.message || 'Upload failed'));
          } catch {
            reject(new CloudinaryUploadError('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new CloudinaryUploadError('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new CloudinaryUploadError('Upload was cancelled'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      throw error;
    }
    throw new CloudinaryUploadError(
      error instanceof Error ? error.message : 'Unknown upload error'
    );
  }
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  if (!file) return 'No file selected';

  if (!file.type.startsWith('image/')) {
    return 'Please select an image file (PNG, JPG, GIF, WebP)';
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return 'File size must be less than 5MB';
  }

  return null;
}
