const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server for the API
const apiProxy = httpProxy.createProxyServer({ target: 'http://localhost:3000', ws: true });

// Create a proxy server for the main server
const mainProxy = httpProxy.createProxyServer({ target: 'http://localhost:8080', ws: true });

// Maximum header length to prevent DoS attacks (8KB is a reasonable limit)
const MAX_HEADER_LENGTH = 8192;

// Rate limiting and temporary ban tracking
const rateLimitMap = new Map(); // IP -> { count, resetTime }
const bannedIPs = new Set(); // Permanently banned IPs for this session
const TEMP_BAN_DURATION = 300000; // 5 minutes
const MAX_REQUESTS_PER_MINUTE = 60;

// Get client IP from request
function getClientIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
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

// Create an HTTP server to handle incoming requests
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
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      if (!res.headersSent) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
      }
      return;
    }
    
    // Sanitize headers before processing
    sanitizeHeaders(req);
    
    // Check the host header to determine where to route the request
    const host = req.headers.host;

    if (host === 'api.swordbattle.io') {
      // Proxy requests to the API
      apiProxy.web(req, res);
    } else if (host === 'na.swordbattle.io') {
      // Proxy requests to the main server
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

// Set maximum header size to prevent oversized header DoS attacks
server.maxHeadersCount = 50;
server.headersTimeout = 20000; // 20 seconds
server.requestTimeout = 30000; // 30 seconds
server.keepAliveTimeout = 5000; // 5 seconds

// --- ADDED: robust error handlers to prevent proxy crash on ECONNRESET / socket hang ups ---

// Generic HTTP proxy error handler (for web requests)
function attachProxyErrorHandlers(proxy, name) {
  proxy.on('error', (err, req, res) => {
    console.error(`${name} proxy error:`, err && err.code ? `${err.code} ${err.message}` : err);
    // If response is available, try to return a 502 to the client instead of letting process throw
    if (res && !res.headersSent) {
      try {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad gateway');
      } catch (e) { /* ignore */ }
    }
  });

  // protect underlying proxy request sockets too
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.on('error', (err) => {
      console.error(`${name} proxyReq error:`, err);
    });
  });

  // websocket-level errors
  proxy.on('error', (err) => {
    console.error(`${name} ws error:`, err);
  });
}

attachProxyErrorHandlers(apiProxy, 'API');
attachProxyErrorHandlers(mainProxy, 'MAIN');

// Protect server upgrade (ws) handling from throwing and ensure socket is destroyed on failure
server.on('upgrade', (req, socket, head) => {
  try {
    // Get client IP
    const clientIP = getClientIP(req);
    
    // Check if IP is banned
    if (bannedIPs.has(clientIP)) {
      console.warn(`[SECURITY] Blocked WebSocket upgrade from banned IP: ${clientIP}`);
      try {
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      } catch (e) {}
      return;
    }
    
    // Sanitize headers before processing WebSocket upgrade
    sanitizeHeaders(req);
    
    const host = req.headers.host;
    if (host === 'api.swordbattle.io') {
      apiProxy.ws(req, socket, head);
    } else if (host === 'na.swordbattle.io') {
      mainProxy.ws(req, socket, head);
    } else {
      socket.destroy();
    }
  } catch (err) {
    console.error('Proxy upgrade error:', err);
    try { socket.destroy(); } catch (e) {}
  }
});

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

// Process-level error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception in proxy:', err);
  // Don't exit - continue running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection in proxy:', reason);
  // Don't exit - continue running
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT}`);
  console.log('[SECURITY] Header protection enabled with max size: 8KB');
  console.log('[SECURITY] Rate limiting enabled: 60 req/min');
});
