/**
 * Cloudinary CDN Photo Upload Helper
 * Offloads photo storage to Cloudinary so database only stores short CDN URLs (~60 bytes)
 * rather than massive base64 strings (50,000+ bytes).
 */

export interface UploadResult {
  url: string;
  isCdn: boolean;
  sizeKB?: number;
}

export async function uploadPhotoToCloudinary(
  base64DataUrl: string
): Promise<UploadResult> {
  if (!base64DataUrl) {
    return { url: '', isCdn: false };
  }

  // If already an HTTP/HTTPS URL, don't re-upload
  if (base64DataUrl.startsWith('http://') || base64DataUrl.startsWith('https://')) {
    return { url: base64DataUrl, isCdn: true };
  }

  try {
    // 1. First attempt: Direct unsigned upload if client env is configured
    const clientCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const clientPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'pm_unsigned';

    if (clientCloudName) {
      try {
        const directRes = await fetch(
          `https://api.cloudinary.com/v1_1/${clientCloudName}/image/upload`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: base64DataUrl,
              upload_preset: clientPreset,
              folder: 'pentecostal_matrimony',
            }),
          }
        );
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData.secure_url || directData.url) {
            return {
              url: directData.secure_url || directData.url,
              isCdn: true,
              sizeKB: Math.round((directData.bytes || 0) / 1024),
            };
          }
        }
      } catch (err) {
        console.warn('[Cloudinary Direct] Failed, falling back to serverless upload:', err);
      }
    }

    // 2. Second attempt: Serverless /api/upload endpoint
    const apiRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64DataUrl }),
    });

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData.success && apiData.url && apiData.url.startsWith('http')) {
        return {
          url: apiData.url,
          isCdn: true,
          sizeKB: Math.round((apiData.bytes || 0) / 1024),
        };
      }
      if (apiData.url) {
        return { url: apiData.url, isCdn: apiData.url.startsWith('http') };
      }
    }
  } catch (err) {
    console.warn('[Cloudinary Helper] Upload error (using compressed fallback):', err);
  }

  // 3. Fallback: Return original compressed image (<50KB)
  return { url: base64DataUrl, isCdn: false };
}
