/**
 * Storage Helper Functions
 * Provides easy-to-use file upload/download operations for Mini Gudie
 */

import { supabase } from './client';

export type StorageBucket =
    | 'profile-pictures'
    | 'place-images'
    | 'review-images'
    | 'trip-documents';

export interface UploadOptions {
    bucket: StorageBucket;
    file: File;
    path?: string;
    userId?: string;
    upsert?: boolean;
}

export interface UploadResult {
    url: string | null;
    path: string | null;
    error: Error | null;
}

/**
 * Upload a file to Supabase Storage
 */
export const uploadFile = async ({
    bucket,
    file,
    path,
    userId,
    upsert = false,
}: UploadOptions): Promise<UploadResult> => {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Construct file path
        const filePath = path
            ? `${path}/${fileName}`
            : userId
                ? `${userId}/${fileName}`
                : fileName;

        // Upload file
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert,
            });

        if (error) {
            return { url: null, path: null, error };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            url: publicUrl,
            path: data.path,
            error: null,
        };
    } catch (error) {
        return {
            url: null,
            path: null,
            error: error as Error,
        };
    }
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
    userId: string,
    file: File
): Promise<UploadResult> => {
    return uploadFile({
        bucket: 'profile-pictures',
        file,
        userId,
        upsert: true, // Allow replacing existing profile picture
    });
};

/**
 * Upload place image
 */
export const uploadPlaceImage = async (
    file: File,
    placeId?: string
): Promise<UploadResult> => {
    return uploadFile({
        bucket: 'place-images',
        file,
        path: placeId ? `places/${placeId}` : 'places',
    });
};

/**
 * Upload review image
 */
export const uploadReviewImage = async (
    userId: string,
    file: File,
    reviewId?: string
): Promise<UploadResult> => {
    return uploadFile({
        bucket: 'review-images',
        file,
        path: reviewId ? `${userId}/${reviewId}` : userId,
    });
};

/**
 * Upload trip document
 */
export const uploadTripDocument = async (
    userId: string,
    tripId: string,
    file: File
): Promise<UploadResult> => {
    return uploadFile({
        bucket: 'trip-documents',
        file,
        path: `${userId}/${tripId}`,
    });
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
    options: UploadOptions[]
): Promise<UploadResult[]> => {
    const uploads = options.map(opt => uploadFile(opt));
    return Promise.all(uploads);
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (
    bucket: StorageBucket,
    filePath: string
): Promise<{ error: Error | null }> => {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

    return { error };
};

/**
 * Delete multiple files
 */
export const deleteMultipleFiles = async (
    bucket: StorageBucket,
    filePaths: string[]
): Promise<{ error: Error | null }> => {
    const { error } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

    return { error };
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: StorageBucket, filePath: string): string => {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return data.publicUrl;
};

/**
 * Download a file
 */
export const downloadFile = async (
    bucket: StorageBucket,
    filePath: string
): Promise<{ data: Blob | null; error: Error | null }> => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

    return { data, error };
};

/**
 * List files in a folder
 */
export const listFiles = async (
    bucket: StorageBucket,
    folder?: string,
    options?: {
        limit?: number;
        offset?: number;
        sortBy?: { column: string; order: 'asc' | 'desc' };
    }
) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
            limit: options?.limit || 100,
            offset: options?.offset || 0,
            sortBy: options?.sortBy || { column: 'name', order: 'asc' },
        });

    return { data, error };
};

/**
 * Move a file to a new location
 */
export const moveFile = async (
    bucket: StorageBucket,
    fromPath: string,
    toPath: string
): Promise<{ error: Error | null }> => {
    const { error } = await supabase.storage
        .from(bucket)
        .move(fromPath, toPath);

    return { error };
};

/**
 * Copy a file to a new location
 */
export const copyFile = async (
    bucket: StorageBucket,
    fromPath: string,
    toPath: string
): Promise<{ error: Error | null }> => {
    const { error } = await supabase.storage
        .from(bucket)
        .copy(fromPath, toPath);

    return { error };
};

/**
 * Create a signed URL for temporary access to a private file
 */
export const createSignedUrl = async (
    bucket: StorageBucket,
    filePath: string,
    expiresIn: number = 3600 // Default 1 hour
): Promise<{ url: string | null; error: Error | null }> => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

    return {
        url: data?.signedUrl || null,
        error,
    };
};

/**
 * Validate file before upload
 */
export const validateFile = (
    file: File,
    options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    }
): { valid: boolean; error?: string } => {
    const { maxSizeMB = 10, allowedTypes = [] } = options;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit`,
        };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} is not allowed`,
        };
    }

    return { valid: true };
};

/**
 * Compress image before upload
 */
export const compressImage = async (
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    file.type,
                    quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
    });
};

/**
 * Get storage bucket usage
 */
export const getBucketUsage = async (bucket: StorageBucket) => {
    // Note: This requires admin privileges
    // For client-side, you'll need to implement this via an edge function
    console.warn('getBucketUsage requires admin privileges');
    return { size: 0, fileCount: 0 };
};

// Preset validation rules for different file types
export const FILE_VALIDATION_RULES = {
    'profile-pictures': {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    'place-images': {
        maxSizeMB: 10,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    'review-images': {
        maxSizeMB: 5,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    'trip-documents': {
        maxSizeMB: 10,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    },
} as const;
