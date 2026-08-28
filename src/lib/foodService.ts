import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { FoodLog, FoodScanResult, FoodItem, FoodNutritionTotal } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error in FoodService:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Image Preparation & Client-side Compression
// -------------------------------------------------------------

export interface PreparedImageResult {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
  fileSizeFormatted: string;
}

/**
 * Validates and prepares an uploaded or camera-captured image.
 * Resizes large dimensions to max 1200px and converts to optimized JPEG
 * for fast upload and minimal payload overhead.
 */
export async function compressAndPrepareImage(file: File): Promise<PreparedImageResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic'];
  if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
    throw new Error('Please select a JPG, PNG, or WEBP photo.');
  }

  // Validate maximum raw file size (12MB ceiling)
  const MAX_BYTES = 12 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error('Image file is too large. Please select a photo under 12MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file. Please try again.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not process image format.'));
      img.onload = () => {
        try {
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas context not available.');
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed JPEG
          const mimeType = 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, 0.85);
          const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

          const kbSize = Math.round((base64.length * 0.75) / 1024);
          const fileSizeFormatted = kbSize > 1024 ? `${(kbSize / 1024).toFixed(1)} MB` : `${kbSize} KB`;

          resolve({
            base64,
            mimeType,
            previewUrl: dataUrl,
            fileName: file.name || 'food_photo.jpg',
            fileSizeFormatted,
          });
        } catch (canvasErr) {
          reject(new Error('Failed to compress image. Please try another photo.'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// OpenAI Server-Side Food Scanner API
// -------------------------------------------------------------

/**
 * Sends the image to the secure server endpoint `/api/scan-food`.
 * The server securely coordinates with the OpenAI API using the server secret key.
 */
export async function scanFoodWithAI(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  userPromptNotes?: string
): Promise<FoodScanResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    let idToken: string | undefined;
    if (auth.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch {
        // Fallback if token fetch fails
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch('/api/scan-food', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64,
        mimeType,
        userPromptNotes: userPromptNotes?.trim() || undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = 'Failed to analyze food.';
      try {
        const errorJson = await response.json();
        if (errorJson?.error) {
          errorMsg = errorJson.error;
        }
      } catch {
        if (response.status === 429) {
          errorMsg = 'Food analysis is temporarily unavailable. Please try again later.';
        } else if (response.status === 503) {
          errorMsg = 'OpenAI service is not configured. Please verify server settings.';
        }
      }
      throw new Error(errorMsg);
    }

    const result: FoodScanResult = await response.json();
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Analysis timed out. Please check your internet connection and try again.');
    }
    throw new Error(err?.message || 'Unable to analyze food. Please try again.');
  }
}

// -------------------------------------------------------------
// Local Caching for Instant UI & Offline Access
// -------------------------------------------------------------

function getCacheKey(userId: string): string {
  return `daily_habits_food_logs_${userId}`;
}

export function getCachedFoodLogs(userId?: string | null): FoodLog[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

export function setCachedFoodLogs(userId: string, logs: FoodLog[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(logs));
  } catch {
    // Ignore storage quota error
  }
}

// -------------------------------------------------------------
// Firestore Persistence
// -------------------------------------------------------------

/**
 * Saves a food log entry to users/{userId}/foodLogs/{foodLogId}.
 */
export async function saveFoodLog(
  userId: string,
  data: {
    id?: string;
    date: string;
    mealType?: string;
    foods: FoodItem[];
    total: FoodNutritionTotal;
    source: 'ai' | 'manual';
    confidence: 'low' | 'medium' | 'high';
    suggestions?: string[];
  }
): Promise<FoodLog> {
  const now = new Date().toISOString();
  const id = data.id || `food_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newLog: FoodLog = {
    id,
    userId,
    date: data.date,
    mealType: data.mealType || 'Meal',
    foods: data.foods,
    total: data.total,
    source: data.source || 'ai',
    confidence: data.confidence || 'medium',
    suggestions: data.suggestions || [],
    createdAt: now,
    updatedAt: now,
  };

  // 1. Update local cache immediately
  const existing = getCachedFoodLogs(userId);
  const updatedLogs = [newLog, ...existing.filter((l) => l.id !== id)];
  setCachedFoodLogs(userId, updatedLogs);

  // 2. Persist to Firestore subcollection users/{userId}/foodLogs/{foodLogId}
  const docPath = `users/${userId}/foodLogs/${id}`;
  try {
    const logDocRef = doc(db, 'users', userId, 'foodLogs', id);
    await setDoc(logDocRef, newLog, { merge: true });
    return newLog;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return newLog;
  }
}

/**
 * Deletes a food log entry.
 */
export async function deleteFoodLog(userId: string, foodLogId: string): Promise<void> {
  // Update local cache immediately
  const existing = getCachedFoodLogs(userId);
  const updatedLogs = existing.filter((l) => l.id !== foodLogId);
  setCachedFoodLogs(userId, updatedLogs);

  const docPath = `users/${userId}/foodLogs/${foodLogId}`;
  try {
    const logDocRef = doc(db, 'users', userId, 'foodLogs', foodLogId);
    await deleteDoc(logDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

/**
 * Subscribes to real-time updates of food logs for the authenticated user.
 */
export function subscribeToFoodLogs(
  userId: string,
  onUpdate: (logs: FoodLog[]) => void,
  onError?: (err: any) => void
): () => void {
  const collPath = `users/${userId}/foodLogs`;
  try {
    const logsRef = collection(db, 'users', userId, 'foodLogs');
    const q = query(logsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: FoodLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as FoodLog);
        });
        setCachedFoodLogs(userId, logs);
        onUpdate(logs);
      },
      (error) => {
        console.warn('Food logs subscription notice:', error?.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach food logs listener:', err);
    return () => {};
  }
}
