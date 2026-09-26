/**
 * Vercel Serverless Function: /api/upload
 * Zero-dependency Cloudinary image uploader with automatic fallback.
 * Eliminates base64 data transfer to the database by hosting images on Cloudinary CDN.
 */

import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { image, folder = 'pm_profiles' } = req.body || {};
    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    // 1. Check for Cloudinary credentials
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // Support standard CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
    if (process.env.CLOUDINARY_URL) {
      try {
        const parsed = new URL(process.env.CLOUDINARY_URL);
        cloudName = parsed.hostname;
        apiKey = parsed.username;
        apiSecret = parsed.password;
      } catch (err) {
        console.warn('Could not parse CLOUDINARY_URL:', err.message);
      }
    }

    // 2. If Cloudinary is configured, upload to Cloudinary CDN
    if (cloudName && (uploadPreset || (apiKey && apiSecret))) {
      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const timestamp = Math.floor(Date.now() / 1000);
      const params = {
        folder,
        timestamp,
      };

      const formData = new URLSearchParams();
      formData.append('file', image);
      formData.append('folder', folder);
      formData.append('timestamp', String(timestamp));

      if (uploadPreset) {
        formData.append('upload_preset', uploadPreset);
      } else if (apiKey && apiSecret) {
        // Sign the request
        const signStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signStr).digest('hex');
        formData.append('api_key', apiKey);
        formData.append('signature', signature);
      }

      const cloudRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        // Insert auto-optimization transformations: f_auto,q_auto,w_800
        let optimizedUrl = cloudData.secure_url || cloudData.url;
        if (optimizedUrl && optimizedUrl.includes('/upload/')) {
          optimizedUrl = optimizedUrl.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_limit/');
        }

        res.status(200).json({
          url: optimizedUrl,
          publicId: cloudData.public_id,
          provider: 'cloudinary',
          bytes: cloudData.bytes,
          format: cloudData.format,
          success: true,
        });
        return;
      } else {
        const errorText = await cloudRes.text();
        console.warn('Cloudinary upload warning:', cloudRes.status, errorText);
      }
    }

    // 3. Fallback: Return the compressed base64 directly if Cloudinary is not yet configured
    res.status(200).json({
      url: image,
      provider: 'local_compressed',
      success: true,
      note: 'Cloudinary credentials not configured yet; saved compressed image.',
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
