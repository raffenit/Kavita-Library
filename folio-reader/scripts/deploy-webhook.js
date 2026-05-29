const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.DEPLOY_PORT || 9000;
const REPO_PATH = '/repo';
const DATA_DIR = '/data'; // Mounted volume for profile storage

// Required: DEPLOY_SECRET must be set in environment
const SECRET = process.env.DEPLOY_SECRET;
if (!SECRET) {
  console.error('[FATAL] DEPLOY_SECRET environment variable is required!');
  console.error('');
  console.error('To fix this:');
  console.error('1. Copy the template: cp .env.example .env');
  console.error('2. Edit .env in the same directory as docker-compose.deploy.yml');
  console.error('3. Set DEPLOY_SECRET to a strong password');
  console.error('');
  console.error('The .env file should be located at: /repo/.env');
  process.exit(1);
}

const API_KEY = process.env.FOLIO_API_KEY || SECRET; // Can use same secret or separate key

// Public server URL for client auto-discovery (e.g., http://your-server:9000)
// If not set, clients will need to manually enter the URL
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL || null;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Profile sync functions
function getProfilePath(apiKey) {
  // Use hashed API key as storage key so all devices with same key share profiles
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  return path.join(DATA_DIR, `profiles_${hash}.json`);
}

function loadProfiles(apiKey) {
  const filePath = getProfilePath(apiKey);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[ProfileSync] Error loading profiles:', e);
  }
  return null;
}

function saveProfiles(apiKey, data) {
  const filePath = getProfilePath(apiKey);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('[ProfileSync] Error saving profiles:', e);
    return false;
  }
}

function verifyApiKey(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  if (!authHeader) return false;
  const key = authHeader.replace('Bearer ', '').trim();
  return key === API_KEY;
}

function getApiKeyFromRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '').trim();
}

function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function runDeploy() {
  console.log('[Deploy] Starting deployment...');
  
  const cmd = `cd ${REPO_PATH} && git pull origin main && docker-compose down && docker-compose up -d --build`;
  
  exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[Deploy] Error:', error);
      console.error('[Deploy] Stderr:', stderr);
      return;
    }
    console.log('[Deploy] Success:', stdout);
  });
}

function handleProfileSync(req, res) {
  // Enable CORS first so all responses (including errors) have CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/api\/profiles\/(.+)$/);
  
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  
  const deviceId = match[1];
  const apiKey = getApiKeyFromRequest(req);
  
  // Handle OPTIONS preflight before API key check (CORS preflight doesn't send auth headers)
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    });
    res.end();
    return;
  }
  
  // Verify API key
  if (!verifyApiKey(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  
  if (req.method === 'GET') {
    // Load profiles for this API key (shared across devices)
    const profiles = apiKey ? loadProfiles(apiKey) : null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      deviceId, 
      profiles: profiles || { profiles: [], activeProfileId: null },
      found: profiles !== null 
    }));
    console.log(`[ProfileSync] Loaded profiles for device ${deviceId}, apiKey ${apiKey ? apiKey.substring(0, 4) + '...' : 'none'}: ${profiles ? 'found' : 'not found'}`);
    return;
  }
  
  if (req.method === 'POST') {
    // Save profiles for this API key (shared across devices)
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const success = apiKey ? saveProfiles(apiKey, data) : false;
        res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success, 
          deviceId,
          message: success ? 'Profiles saved' : 'Failed to save profiles'
        }));
        console.log(`[ProfileSync] Saved profiles for device ${deviceId}, apiKey ${apiKey ? apiKey.substring(0, 4) + '...' : 'none'}: ${success ? 'success' : 'failed'}`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

const server = http.createServer((req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    });
    res.end();
    return;
  }

  // Public config endpoint - allows clients to auto-discover the sync server URL
  if (req.url === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      syncServerUrl: PUBLIC_SERVER_URL,
      hasAutoDiscovery: !!PUBLIC_SERVER_URL
    }));
    return;
  }

  // Profile sync endpoint
  if (req.url.startsWith('/api/profiles/')) {
    handleProfileSync(req, res);
    return;
  }

  // Deploy webhook endpoint
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
      res.writeHead(401);
      res.end('Missing signature');
      return;
    }

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      res.writeHead(403);
      res.end('Invalid signature');
      return;
    }

    // Parse the payload
    try {
      const payload = JSON.parse(body);
      const branch = payload.ref?.replace('refs/heads/', '');
      
      console.log(`[Webhook] Push to ${branch}`);
      
      if (branch === 'main') {
        res.writeHead(200);
        res.end('Deploying...');
        runDeploy();
      } else {
        res.writeHead(200);
        res.end('Ignored (not main branch)');
      }
    } catch (e) {
      res.writeHead(400);
      res.end('Invalid payload');
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Deploy Webhook] Listening on port ${PORT}`);
  console.log(`[Deploy Webhook] Set this as your GitHub webhook URL: http://YOUR_IP:${PORT}/deploy`);
  console.log(`[Deploy Webhook] Secret: ${SECRET.substring(0, 4)}...`);
  console.log(`[Profile Sync] Endpoint: http://YOUR_IP:${PORT}/api/profiles/{deviceId}`);
  console.log(`[Profile Sync] Data directory: ${DATA_DIR}`);
  if (PUBLIC_SERVER_URL) {
    console.log(`[Auto-Discovery] Config endpoint: ${PUBLIC_SERVER_URL}/api/config`);
  } else {
    console.log(`[Auto-Discovery] Set PUBLIC_SERVER_URL env var to enable client auto-discovery`);
  }
});
