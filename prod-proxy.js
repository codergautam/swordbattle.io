const http = require('http');
const httpProxy = require('http-proxy');
const crypto = require('crypto');

// Token validation helper
function validateApiToken(token) {
  const secret = process.env.API_TOKEN_SECRET || 'default-secret-change-in-production';

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const timestamp = parseInt(parts[0], 10);
    const nonce = parts[1];
    const signature = parts[2];

    // Check timestamp is within 5 minutes
    const now = Date.now();
    const MAX_AGE = 300000; // 5 minutes
    if (Math.abs(now - timestamp) > MAX_AGE) return false;

    // Verify signature
    const payload = `${timestamp}.${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  } catch (e) {
    return false;
  }
}

require('http').globalAgent.maxSockets = 2048;
require('https').globalAgent.maxSockets = 2048;
if (process.platform === 'linux') {
  try {
    const limit = require('os').cpus().length * 2048;
    require('child_process').execSync(`ulimit -n ${limit}`);
  } catch (e) {
    console.warn('[WARN] Failed to set file descriptor limit:', e.message);
  }
}

const apiProxy = httpProxy.createProxyServer({
  target: 'http://localhost:3000',
  ws: true,
  xfwd: true,
  proxyTimeout: 15000,
  timeout: 15000,
  keepAlive: true,
  followRedirects: true,
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    keepAliveMsecs: 10000,
    maxFreeSockets: 5
  })
});

const mainProxy = httpProxy.createProxyServer({
  target: 'http://localhost:8080',
  ws: true,
  xfwd: true,
  proxyTimeout: 15000,
  timeout: 15000,
  keepAlive: true,
  followRedirects: true,
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 250,
    keepAliveMsecs: 10000,
    maxFreeSockets: 5
  })
});

const MAX_URL_LENGTH = 2000;
const HOMEPAGE_CACHE = Buffer.from('<!DOCTYPE html><html><head><title>Swordbattle</title></head><body><h1>Swordbattle</h1><p>Server is up.</p></body></html>');

let serverinfoCachedResponse = null;
let serverinfoCacheExpiry = 0;
const SERVERINFO_CACHE_TTL = 2000;

function getClientIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    try {
      const raw = String(xForwardedFor);
      const ips = raw.split(',').map(s => s.trim());
      return ips[0] || req.socket.remoteAddress;
    } catch(err) {
      return req.socket.remoteAddress;
    }
  }
  return req.socket.remoteAddress;
}

function sanitizeHeaders(req) {
  const maxHeaderLength = 8192;
  for (const [key, value] of Object.entries(req.headers)) {
    const valueStr = String(value);
    if (valueStr.length > maxHeaderLength) {
      if (key.toLowerCase() === 'x-forwarded-for') {
        const ips = valueStr.split(',');
        req.headers[key] = ips[0].trim().substring(0, 100);
      } else {
        req.headers[key] = valueStr.substring(0, maxHeaderLength);
      }
    }
  }
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  try {
    const clientIP = getClientIP(req);

    if (req.url && req.url.length > MAX_URL_LENGTH) {
      if (!res.headersSent) {
        res.writeHead(414, { 'Content-Type': 'text/plain' });
        res.end('Request-URI Too Long');
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=60', 'Connection': 'close' });
      res.end(HOMEPAGE_CACHE);
      return;
    }

    if (req.method === 'GET' && req.url && req.url.startsWith('/serverinfo')) {
      const now = Date.now();
      if (serverinfoCachedResponse && now < serverinfoCacheExpiry) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=2'
        });
        res.end(serverinfoCachedResponse);
        return;
      }
    }

    // Sanitize headers before processing
    sanitizeHeaders(req);

    // Route based on host header
    const host = req.headers.host;
    if (host === 'api.swordbattle.io') {
      apiProxy.web(req, res);
    } else if (host === 'na.swordbattle.io') {
      mainProxy.web(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (err) {
    console.error('[ERROR] Request handling error:', err);
    if (!res.headersSent) {
      try {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
      } catch (e) {}
    }
  }
});

server.on('upgrade', (req, socket, head) => {
  try {
    // Sanitize headers before processing WebSocket upgrade
    sanitizeHeaders(req);

    // Route WebSocket connections based on host header
    const host = req.headers.host;

    // Set up socket timeout and keepalive
    socket.setTimeout(30000);
    socket.setKeepAlive(true, 10000);

    if (host === 'api.swordbattle.io') {
      apiProxy.ws(req, socket, head);
    } else if (host === 'na.swordbattle.io') {
      mainProxy.ws(req, socket, head);
    } else {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  } catch (err) {
    console.error('Proxy upgrade error:', err);
    try { socket.destroy(); } catch (e) {}
  }
});

function attachProxyErrorHandlers(proxy, name) {
  proxy.on('error', (err, req, res) => {
    if (err.code === 'ECONNRESET') {
      console.debug(`${name} proxy connection reset:`, err.message);
      return;
    }

    console.error(`${name} proxy error:`, err && err.code ? `${err.code} ${err.message}` : err);

    if (res && !res.headersSent) {
      try {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad gateway');
      } catch (e) {}
    }
  });

  proxy.on('proxyReq', (proxyReq, req, res) => {
    proxyReq.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        console.debug(`${name} proxyReq connection reset:`, err.message);
        return;
      }
      console.error(`${name} proxyReq error:`, err);
    });

    proxyReq.setNoDelay(true);
    proxyReq.setTimeout(30000);
  });

  proxy.on('proxyRes', (proxyRes, req, res) => {
    if (proxyRes.statusCode === 101) {
      return;
    }

    proxyRes.on('end', () => {
      if (proxyRes.socket && !proxyRes.socket.destroyed && proxyRes.statusCode !== 101) {
        proxyRes.socket.destroy();
      }
    });
  });

  proxy.on('upgrade', (req, socket) => {
    socket.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        console.debug(`${name} ws connection reset:`, err.message);
        return;
      }
      console.error(`${name} ws error:`, err);
    });

    socket.setTimeout(30000);
    socket.setKeepAlive(true, 10000);
  });

  proxy.on('close', (res, socket, head) => {
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  });
}

attachProxyErrorHandlers(apiProxy, 'API');
attachProxyErrorHandlers(mainProxy, 'MAIN');

server.on('clientError', (err, socket) => {
  console.warn('[ERROR] clientError caught:', err.code, err.message);
  try {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  } catch (e) {}
});

// Start the server
server.listen(process.env.PORT || 80, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT || 80}`);
});
