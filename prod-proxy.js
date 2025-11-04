const http = require('http');
const httpProxy = require('http-proxy');
const net = require('net');

// Increase max sockets and file descriptors
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

// Create a proxy server for the API with proper configuration
const apiProxy = httpProxy.createProxyServer({ 
  target: 'http://localhost:3000',
  ws: true,
  xfwd: true,
  proxyTimeout: 30000, // 30 second timeout
  timeout: 30000,
  keepAlive: true,
  followRedirects: true,
  // Handle buffer size through agent settings
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 100,
    keepAliveMsecs: 30000,
    maxFreeSockets: 10
  })
});

// Create a proxy server for the main server with proper configuration
const mainProxy = httpProxy.createProxyServer({ 
  target: 'http://localhost:8080',
  ws: true,
  xfwd: true,
  proxyTimeout: 30000, // 30 second timeout
  timeout: 30000,
  keepAlive: true,
  followRedirects: true,
  // Handle buffer size through agent settings
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 100,
    keepAliveMsecs: 30000,
    maxFreeSockets: 10
  })
});

// Maximum header length to prevent DoS attacks (8KB is a reasonable limit)
const MAX_HEADER_LENGTH = 8192;

// Rate limiting and temporary ban tracking
const rateLimitMap = new Map(); // IP -> { count, resetTime }
const bannedIPs = new Set(); // Permanently banned IPs for this session
const TEMP_BAN_DURATION = 300000; // 5 minutes
const MAX_REQUESTS_PER_MINUTE = 60;

// Track concurrent requests/connections per IP
const activeConnections = new Map();
const protobufErrorCounts = new Map();
const MAX_CONCURRENT_PER_IP = 12;
const MAX_URL_LENGTH = 2000;
const PROTOBUF_ERROR_THRESHOLD = 3; // Ban after this many errors
const PROTOBUF_ERROR_WINDOW = 60000; // 1 minute window
const SUSPICIOUS_XFF_IPS = new Set();

const homepageIpRate = new Map();
const homepageGlobal = { count: 0, reset: 0 };
const HOMEPAGE_IP_LIMIT = 10;
const HOMEPAGE_IP_TTL = 10000;
const HOMEPAGE_GLOBAL_LIMIT = 100;
const HOMEPAGE_GLOBAL_TTL = 10000;
const HOMEPAGE_CACHE = Buffer.from('<!DOCTYPE html><html><head><title>Swordbattle</title></head><body><h1>Swordbattle</h1><p>Server is up.</p></body></html>');

// Track protobuf errors per IP
function trackProtobufError(ip) {
  const now = Date.now();
  const stats = protobufErrorCounts.get(ip) || {
    count: 0, 
    firstError: now,
    recentErrors: 0
  };

  // Reset if outside window
  if (now - stats.firstError > PROTOBUF_ERROR_WINDOW) {
    stats.count = 1;
    stats.firstError = now;
    stats.recentErrors = 1;
  } else {
    stats.count++;
    stats.recentErrors++;
  }

  protobufErrorCounts.set(ip, stats);

  if (stats.recentErrors >= PROTOBUF_ERROR_THRESHOLD) {
    console.warn(`[SECURITY] IP ${ip} exceeded protobuf error threshold (${stats.recentErrors}). Banning.`);
    bannedIPs.add(ip);
    return false;
  }
  return true;
}

function getClientIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    try {
      const raw = String(xForwardedFor);
      // If header too long or contains weird data, treat as malicious
      if (raw.length > MAX_HEADER_LENGTH) {
        // Ban the connecting socket IP (not the forged header)
        const sockIp = req.socket && req.socket.remoteAddress;
        if (sockIp) {
          console.warn(`[SECURITY] Malformed X-Forwarded-For from ${sockIp} (len=${raw.length}). Banning.`);
          bannedIPs.add(sockIp);
        }
        return req.socket.remoteAddress;
      }

      const ips = raw.split(',').map(s => s.trim());
      // Validate first entry is an IP; if not, fallback to socket remoteAddress and ban
      const candidate = ips[0];
      if (net.isIP(candidate)) {
        return candidate;
      }
      const sockIp2 = req.socket && req.socket.remoteAddress;
      if (sockIp2) {
        console.warn(`[SECURITY] Suspicious X-Forwarded-For value (${candidate}) from ${sockIp2}. Banning.`);
        bannedIPs.add(sockIp2);
      }
      return req.socket.remoteAddress;
    } catch(err) {
      return req.socket.remoteAddress;
    }
  }
  return req.socket.remoteAddress;
}

// Check rate limiting for an IP
function checkRateLimit(ip) {
  const now = Date.now();
  const data = rateLimitMap.get(ip);
  
  if (!data) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  // Reset counter if expired
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + 60000;
    return true;
  }
  
  data.count++;
  
  // Check if exceeded limit
  if (data.count > MAX_REQUESTS_PER_MINUTE) {
    console.warn(`[RATE_LIMIT] IP ${ip} exceeded rate limit (${data.count} requests/min). Temporarily banning.`);
    bannedIPs.add(ip);
    // Auto-remove from ban after TEMP_BAN_DURATION
    setTimeout(() => {
      bannedIPs.delete(ip);
      rateLimitMap.delete(ip);
      console.log(`[RATE_LIMIT] Temporary ban expired for IP ${ip}`);
    }, TEMP_BAN_DURATION);
    return false;
  }
  return true;
}

// Sanitize and trim oversized headers
function sanitizeHeaders(req) {
  for (const [key, value] of Object.entries(req.headers)) {
    const valueStr = String(value);
    // If header value is too large, truncate it or remove it
    if (valueStr.length > MAX_HEADER_LENGTH) {
      console.warn(`[SECURITY] Truncating oversized header: ${key} (${valueStr.length} bytes)`);
      // For x-forwarded-for, just take the first part
      if (key.toLowerCase() === 'x-forwarded-for') {
        const ips = valueStr.split(',');
        req.headers[key] = ips[0].trim().substring(0, 100); // First IP only, max 100 chars
      } else {
        // For other headers, truncate to max length
        req.headers[key] = valueStr.substring(0, MAX_HEADER_LENGTH);
      }
    }
  }
}

// Create the HTTP server
const server = http.createServer((req, res) => {
  try {
    // Get client IP
    const clientIP = getClientIP(req);
    
    // Check if IP is banned
    if (bannedIPs.has(clientIP)) {
      console.warn(`[SECURITY] Blocked request from banned IP: ${clientIP}`);
      if (!res.headersSent) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
      }
      return;
    }

    // Basic URL length protection
    if (req.url && req.url.length > MAX_URL_LENGTH) {
      console.warn(`[SECURITY] Oversized URL from ${clientIP} (len=${req.url.length}). Banning.`);
      bannedIPs.add(clientIP);
      if (!res.headersSent) {
        res.writeHead(414, { 'Content-Type': 'text/plain' });
        res.end('Request-URI Too Long');
      }
      return;
    }

    // Track concurrent connections per IP
    const current = activeConnections.get(clientIP) || 0;
    if (current >= MAX_CONCURRENT_PER_IP) {
      console.warn(`[SECURITY] Too many concurrent connections from ${clientIP} (${current}). Temporarily banning.`);
      bannedIPs.add(clientIP);
      setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION);
      if (!res.headersSent) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
      }
      return;
    }
    activeConnections.set(clientIP, current + 1);

    // Handle homepage requests
    if (req.method === 'GET' && req.url === '/') {
      const now = Date.now();
      let ipData = homepageIpRate.get(clientIP);
      if (!ipData || now > ipData.reset) {
        ipData = { count: 1, reset: now + HOMEPAGE_IP_TTL };
        homepageIpRate.set(clientIP, ipData);
      } else {
        ipData.count++;
        if (ipData.count > HOMEPAGE_IP_LIMIT) {
          console.warn(`[SECURITY] IP ${clientIP} exceeded homepage GET / rate (${ipData.count}/${HOMEPAGE_IP_TTL/1000}s). Banning.`);
          bannedIPs.add(clientIP);
          setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION);
          if (!res.headersSent) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            res.end('Too Many Requests');
          }
          return;
        }
      }

      if (now > homepageGlobal.reset) {
        homepageGlobal.count = 1;
        homepageGlobal.reset = now + HOMEPAGE_GLOBAL_TTL;
      } else {
        homepageGlobal.count++;
        if (homepageGlobal.count > HOMEPAGE_GLOBAL_LIMIT) {
          console.warn(`[SECURITY] GLOBAL homepage GET / rate exceeded (${homepageGlobal.count}/${HOMEPAGE_GLOBAL_TTL/1000}s). Dropping requests.`);
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('Server busy');
          }
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=60' });
      res.end(HOMEPAGE_CACHE);
      return;
    }

    if (!checkRateLimit(clientIP)) {
      if (!res.headersSent) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
      }
      return;
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
    console.error('[SECURITY] Request handling error:', err);
    if (!res.headersSent) {
      try {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
      } catch (e) {
        // Ignore errors when responding
      }
    }
  }
});

// Handle WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
  try {
    // Get client IP
    const clientIP = getClientIP(req);
    
    // Check if IP is banned
    if (bannedIPs.has(clientIP)) {
      console.warn(`[SECURITY] Blocked WebSocket upgrade from banned IP: ${clientIP}`);
      try { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); } catch (e) {}
      return;
    }
    
    // Track concurrent connections for WS too
    const cur = activeConnections.get(clientIP) || 0;
    if (cur >= MAX_CONCURRENT_PER_IP) {
      console.warn(`[SECURITY] Too many concurrent WS connections from ${clientIP} (${cur}). Rejecting.`);
      try { socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n'); } catch (e) {}
      return;
    }
    activeConnections.set(clientIP, cur + 1);
    socket.on && socket.on('close', () => {
      try { const c = activeConnections.get(clientIP) || 0; if (c <= 1) activeConnections.delete(clientIP); else activeConnections.set(clientIP, c - 1); } catch (e) {}
    });
    
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

// Generic HTTP proxy error handler (for web requests)
function attachProxyErrorHandlers(proxy, name) {
  proxy.on('error', (err, req, res) => {
    if (err.code === 'ECONNRESET') {
      // Connection reset is common for websockets, just debug log
      console.debug(`${name} proxy connection reset:`, err.message);
      return;
    }
    
    console.error(`${name} proxy error:`, err && err.code ? `${err.code} ${err.message}` : err);
    
    // Track protobuf errors if detected
    if (err.code === 'PROTOBUF_ERROR' && req) {
      const ip = getClientIP(req);
      trackProtobufError(ip);
    }
    
    // If response is available, try to return a 502 to the client instead of letting process throw
    if (res && !res.headersSent) {
      try {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad gateway');
      } catch (e) { /* ignore */ }
    }
  });

  // Handle proxy request errors
  proxy.on('proxyReq', (proxyReq, req, res) => {
    proxyReq.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        console.debug(`${name} proxyReq connection reset:`, err.message);
        return;
      }
      console.error(`${name} proxyReq error:`, err);
    });

    // Set timeout and keepalive
    proxyReq.setNoDelay(true);
    proxyReq.setTimeout(30000);
  });

  // Handle proxy response setup
  proxy.on('proxyRes', (proxyRes, req, res) => {
    // Ensure proper cleanup of sockets
    proxyRes.on('end', () => {
      if (proxyRes.socket) {
        proxyRes.socket.destroy();
      }
    });
  });

  // Handle websocket upgrade
  proxy.on('upgrade', (req, socket) => {
    socket.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        console.debug(`${name} ws connection reset:`, err.message);
        return;
      }
      console.error(`${name} ws error:`, err);
    });

    // Set socket timeout and keepalive
    socket.setTimeout(30000);
    socket.setKeepAlive(true, 10000);
  });

  // Handle websocket close
  proxy.on('close', (res, socket, head) => {
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  });
}

attachProxyErrorHandlers(apiProxy, 'API');
attachProxyErrorHandlers(mainProxy, 'MAIN');

// Also guard 'clientError' on the HTTP server - this handles oversized headers
server.on('clientError', (err, socket) => {
  console.warn('[SECURITY] clientError caught:', err.code, err.message);
  
  // Extract IP from socket if possible for logging
  const clientIP = socket.remoteAddress || 'unknown';
  
  // Ban IPs that cause oversized header errors
  if (err.code === 'HPE_HEADER_OVERFLOW' || err.message && err.message.includes('header')) {
    console.error(`[SECURITY] BANNING IP ${clientIP} for oversized header attack`);
    bannedIPs.add(clientIP);
  }
  
  try { 
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); 
  } catch (e) {}
});

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  
  // Clean up protobuf error counts older than window
  for (const [ip, stats] of protobufErrorCounts) {
    if (now - stats.firstError > PROTOBUF_ERROR_WINDOW) {
      protobufErrorCounts.delete(ip);
    }
  }
  
  // Clean up homepage rate limits
  for (const [ip, data] of homepageIpRate) {
    if (now > data.reset) homepageIpRate.delete(ip);
  }
}, 60000);

// Start the server
server.listen(process.env.PORT || 80, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT || 80}`);
  console.log('[SECURITY] Header protection enabled with max size: 8KB');
  console.log('[SECURITY] Rate limiting enabled: 60 req/min');
  console.log('[SECURITY] WebSocket handling improved');
});