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
    const { image, upload_preset, cloud_name } = req.body || {};
    if (!image) {
      res.status(400).json({ error: 'Missing image data' });
      return;
    }

    // Determine Cloudinary credentials
    let cloudName = cloud_name || process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;
    let uploadPreset = upload_preset || process.env.CLOUDINARY_UPLOAD_PRESET || 'pm_unsigned';

    // Parse CLOUDINARY_URL if provided (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
    if (process.env.CLOUDINARY_URL && !cloudName) {
      try {
        const parsed = new URL(process.env.CLOUDINARY_URL);
        cloudName = parsed.hostname;
        apiKey = parsed.username;
        apiSecret = parsed.password;
      } catch (err) {
        console.warn('Could not parse CLOUDINARY_URL:', err);
      }
    }

    // If Cloudinary credentials are not configured, return safe fallback
    if (!cloudName) {
      res.status(200).json({
        fallback: true,
        url: image,
        message: 'Cloudinary not configured yet; stored compressed image locally',
      });
      return;
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    let bodyData = {};

    if (apiSecret && apiKey) {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'pentecostal_matrimony';
      const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');

      bodyData = {
        file: image,
        api_key: apiKey,
        timestamp,
        folder,
        signature,
      };
    } else {
      bodyData = {
        file: image,
        upload_preset: uploadPreset,
        folder: 'pentecostal_matrimony',
      };
    }

    const cRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    if (!cRes.ok) {
      const errText = await cRes.text();
      console.warn('Cloudinary upload warning:', errText);
      // Non-fatal: fallback to compressed image
      res.status(200).json({
        fallback: true,
        url: image,
        warning: 'Cloudinary rejected request; used compressed fallback',
      });
      return;
    }

    const cData = await cRes.json();
    const cdnUrl = cData.secure_url || cData.url;

    res.status(200).json({
      success: true,
      url: cdnUrl,
      publicId: cData.public_id,
      bytes: cData.bytes,
      format: cData.format,
      width: cData.width,
      height: cData.height,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(200).json({
      fallback: true,
      url: req.body?.image || '',
      error: err.message,
    });
  }
}
