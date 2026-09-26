/**
 * Vercel Serverless Function: /api/status
 * Health check & diagnostic endpoint to verify serverless function execution and Blob token status.
 */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const envKeys = Object.keys(process.env).filter(k => 
    k.toUpperCase().includes('BLOB') || 
    k.toUpperCase().includes('TOKEN') || 
    k.toUpperCase().includes('STORE')
  );

  res.status(200).json({
    status: 'ok',
    serverless: true,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    foundEnvKeys: envKeys,
    timestamp: new Date().toISOString(),
  });
}
