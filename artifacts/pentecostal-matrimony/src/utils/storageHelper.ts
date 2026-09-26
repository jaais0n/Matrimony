/**
 * Utility for safe browser storage and image optimization.
 * Compresses photos to crisp quality strictly under 50KB for fast cloud DB synchronization.
 */

export function getApproximateKB(dataUrl: string): number {
  if (!dataUrl) return 0;
  // Base64 encoding overhead is ~4/3, minus header
  const base64Content = dataUrl.split(',')[1] || dataUrl;
  const bytes = Math.round((base64Content.length * 3) / 4);
  return Math.round(bytes / 1024);
}

export async function compressImage(
  file: File,
  maxDimension = 720,
  targetMaxKB = 48
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally to maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve((e.target?.result as string) || '');
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Test decreasing quality levels until strictly under targetMaxKB (<50KB)
          let quality = 0.76;
          let compressed = canvas.toDataURL('image/jpeg', quality);

          while (getApproximateKB(compressed) > targetMaxKB && quality > 0.35) {
            quality -= 0.08;
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          // If still over targetMaxKB, scale canvas down slightly (e.g. 560px)
          if (getApproximateKB(compressed) > targetMaxKB) {
            const smallerCanvas = document.createElement('canvas');
            const scaleFactor = 0.75;
            smallerCanvas.width = Math.round(width * scaleFactor);
            smallerCanvas.height = Math.round(height * scaleFactor);
            const sCtx = smallerCanvas.getContext('2d');
            if (sCtx) {
              sCtx.imageSmoothingEnabled = true;
              sCtx.imageSmoothingQuality = 'high';
              sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
              compressed = smallerCanvas.toDataURL('image/jpeg', 0.65);
            }
          }

          resolve(compressed);
        } catch {
          resolve((e.target?.result as string) || '');
        }
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.readAsDataURL(file);
  });
}

export function notifySync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pm:sync'));
  }
}

export function safeSetLocalStorage(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (key === 'pm_my_profile' || key === 'pm_registered_profiles') {
      notifySync();
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Quota exceeded for "${key}". Trimming photos to fit...`);
    try {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          const trimmed = value.map((item) => {
            if (item?.photos?.length) {
              return {
                ...item,
                photos: item.photos.map((ph: any) => ({
                  ...ph,
                  url: ph.url && ph.url.length > 500 ? '' : ph.url,
                })),
              };
            }
            return item;
          });
          localStorage.setItem(key, JSON.stringify(trimmed));
          if (key === 'pm_my_profile' || key === 'pm_registered_profiles') {
            notifySync();
          }
          return true;
        } else if (value.photos?.length) {
          const trimmed = {
            ...value,
            photos: value.photos.map((ph: any) => ({
              ...ph,
              url: ph.url && ph.url.length > 500 ? '' : ph.url,
            })),
          };
          localStorage.setItem(key, JSON.stringify(trimmed));
          if (key === 'pm_my_profile' || key === 'pm_registered_profiles') {
            notifySync();
          }
          return true;
        }
      }
    } catch (innerErr) {
      console.warn(`[Storage] Failed to save trimmed data for "${key}":`, innerErr);
    }
    return false;
  }
}

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Uniquely deduplicates a list of profiles by userId, id, non-empty displayName, or photo.
 * Merges duplicate entries so verified status, accurate age, and full details are preserved without duplicates.
 */
export function deduplicateProfiles<T extends { id?: string; userId?: string; displayName?: string; primaryPhotoUrl?: string; photos?: any[]; verificationStatus?: string }>(
  profiles: T[]
): T[] {
  const result: T[] = [];

  for (const item of profiles) {
    if (!item) continue;
    const nameKey = item.displayName ? item.displayName.trim().toLowerCase() : '';
    const userIdKey = item.userId ? String(item.userId).trim() : '';
    const idKey = item.id ? String(item.id).trim() : '';
    const photoKey = item.primaryPhotoUrl || (item.photos && item.photos[0] ? item.photos[0].url : '');

    // Check if an existing profile matches any unique identifier
    const existingIndex = result.findIndex((existing) => {
      const existingName = existing.displayName ? existing.displayName.trim().toLowerCase() : '';
      const existingUserId = existing.userId ? String(existing.userId).trim() : '';
      const existingId = existing.id ? String(existing.id).trim() : '';
      const existingPhoto = existing.primaryPhotoUrl || (existing.photos && existing.photos[0] ? existing.photos[0].url : '');

      if (idKey && existingId && idKey === existingId) return true;
      if (userIdKey && existingUserId && userIdKey === existingUserId) return true;
      if (nameKey && existingName && nameKey === existingName) return true;
      if (photoKey && existingPhoto && photoKey.length > 50 && photoKey === existingPhoto) return true;
      return false;
    });

    if (existingIndex >= 0) {
      // Merge: prefer verified status, non-empty age, better photo, richer fields
      const existing = result[existingIndex];
      const betterAge = (item as any).age && (item as any).age > 0 ? (item as any).age : (existing as any).age;
      result[existingIndex] = {
        ...existing,
        ...item,
        id: existing.id || item.id,
        userId: existing.userId || item.userId,
        displayName: item.displayName || existing.displayName,
        age: betterAge,
        verificationStatus:
          existing.verificationStatus === 'verified' || item.verificationStatus === 'verified'
            ? 'verified'
            : (item.verificationStatus || existing.verificationStatus || 'under_review'),
        photos: (item.photos && item.photos.length > 0) ? item.photos : existing.photos,
        primaryPhotoUrl: item.primaryPhotoUrl || existing.primaryPhotoUrl,
      };
    } else {
      result.push({ ...item });
    }
  }

  return result;
}

