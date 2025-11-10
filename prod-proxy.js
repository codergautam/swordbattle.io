const http = require('http');
const httpProxy = require('http-proxy');
const net = require('net');
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
  proxyTimeout: 15000, // Reduced timeout
  timeout: 15000,
  keepAlive: true,
  followRedirects: true,
  // Handle buffer size through agent settings
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 50, // Reduced concurrent connections
    keepAliveMsecs: 10000,
    maxFreeSockets: 5
  })
});

// Create a proxy server for the main server with proper configuration
const mainProxy = httpProxy.createProxyServer({ 
  target: 'http://localhost:8080',
  ws: true,
  xfwd: true,
  proxyTimeout: 15000, // Reduced timeout
  timeout: 15000,
  keepAlive: true,
  followRedirects: true,
  // Handle buffer size through agent settings
  agent: new http.Agent({
    keepAlive: true,
    maxSockets: 50, // Reduced concurrent connections
    keepAliveMsecs: 10000,
    maxFreeSockets: 5
  })
});

// Maximum header length to prevent DoS attacks (8KB is a reasonable limit)
const MAX_HEADER_LENGTH = 8192;

// Enhanced rate limiting and ban tracking
const rateLimitMap = new Map(); // IP -> { count, resetTime, errorCount, lastError }
const bannedIPs = new Set(); // Permanently banned IPs for this session
const TEMP_BAN_DURATION = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 600;
const ERROR_BAN_THRESHOLD = 10;
const ERROR_WINDOW = 20000;
const CONCURRENT_CONN_LIMIT = 50;
const SUSPICIOUS_SIZE = 1982; // The suspicious message size
let currentConnections = 0;

// Enhanced connection tracking
const activeConnections = new Map(); // IP -> {count, firstConn, connHistory}
const protobufErrorCounts = new Map();
const MAX_URL_LENGTH = 2000;
const SUSPICIOUS_XFF_IPS = new Set();

// Connection rate tracking
const CONN_RATE_WINDOW = 10000; // 10 second window
const MAX_CONN_PER_WINDOW = 20; // More forgiving burst connection rate
const CONN_HISTORY_SIZE = 5; // Track last 5 connections

const homepageIpRate = new Map();
const homepageGlobal = { count: 0, reset: 0 };
const HOMEPAGE_IP_LIMIT = 200;
const HOMEPAGE_IP_TTL = 30000;
const HOMEPAGE_GLOBAL_LIMIT = 2000;
const HOMEPAGE_GLOBAL_TTL = 30000;
const HOMEPAGE_CACHE = Buffer.from('<!DOCTYPE html><html><head><title>Swordbattle</title></head><body><h1>Swordbattle</h1><p>Server is up.</p></body></html>');

const timestampFailures = new Map();
const TIMESTAMP_FAIL_THRESHOLD = 5;
const TIMESTAMP_FAIL_WINDOW = 300000;

const serverinfoIpRate = new Map();
const serverinfoProxyRate = new Map();
const serverinfoBannedProxies = new Set();
const SERVERINFO_IP_LIMIT = 300;
const SERVERINFO_IP_TTL = 60000;
const SERVERINFO_PROXY_LIMIT = 500;
const SERVERINFO_PROXY_TTL = 60000;
const SERVERINFO_BURST_LIMIT = 100;
const SERVERINFO_BURST_TTL = 5000;
let serverinfoCachedResponse = null;
let serverinfoCacheExpiry = 0;
const SERVERINFO_CACHE_TTL = 2000;

const endpointIpRate = new Map();
const endpointProxyRate = new Map();
const endpointBannedProxies = new Set();
const ENDPOINT_IP_LIMIT = 300;
const ENDPOINT_IP_TTL = 60000;
const ENDPOINT_PROXY_LIMIT = 500;
const ENDPOINT_PROXY_TTL = 60000;
const ENDPOINT_BURST_LIMIT = 100;
const ENDPOINT_BURST_TTL = 5000;

// Track protobuf errors per IP
function trackProtobufError(ip, msgSize) {
  const now = Date.now();
  const stats = protobufErrorCounts.get(ip) || {
    count: 0, 
    firstError: now,
    recentErrors: 0,
    suspiciousCount: 0
  };

  // Immediate ban for known malicious message size
  if (msgSize === SUSPICIOUS_SIZE || msgSize === SUSPICIOUS_SIZE + 97) {
    console.warn(`[SECURITY] IP ${ip} sent known malicious message size (${msgSize}). Immediate ban.`);
    bannedIPs.add(ip);
    return false;
  }

  // Reset if outside window
  if (now - stats.firstError > ERROR_WINDOW) {
    stats.count = 1;
    stats.firstError = now;
    stats.recentErrors = 1;
    stats.suspiciousCount = 0;
  } else {
    stats.count++;
    stats.recentErrors++;
    if (msgSize > 1024) stats.suspiciousCount++;
  }

  protobufErrorCounts.set(ip, stats);

  // Ban for rapid errors or suspicious patterns
  if (stats.recentErrors >= ERROR_BAN_THRESHOLD || stats.suspiciousCount >= 2) {
    console.warn(`[SECURITY] IP ${ip} triggered protobuf protection (errors=${stats.recentErrors}, suspicious=${stats.suspiciousCount}). Banning.`);
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

    // Early check for banned proxy IPs before any processing
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const proxyIP = xForwardedFor.split(',').map(s => s.trim()).pop();
      if (proxyIP && (serverinfoBannedProxies.has(proxyIP) || endpointBannedProxies.has(proxyIP))) {
        if (!res.headersSent) {
          res.writeHead(403);
          res.end();
        }
        return;
      }
    }

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
    if (current >= CONCURRENT_CONN_LIMIT) {
      console.warn(`[SECURITY] Too many concurrent connections from ${clientIP} (${current}). Rejecting request.`);
      if (!res.headersSent) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
      }
      return;
    }
    activeConnections.set(clientIP, current + 1);

    res.on('finish', () => {
      const count = activeConnections.get(clientIP) || 0;
      if (count <= 1) {
        activeConnections.delete(clientIP);
      } else {
        activeConnections.set(clientIP, count - 1);
      }
    });

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

    if (req.method === 'GET' && req.url && req.url.startsWith('/serverinfo')) {
      const now = Date.now();
      const xForwardedFor = req.headers['x-forwarded-for'];
      const proxyIP = xForwardedFor ? xForwardedFor.split(',').map(s => s.trim()).pop() : null;

      const malformedMatch = req.url.match(/^\/serverinfo\d+/);
      if (malformedMatch) {
        bannedIPs.add(clientIP);
        setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION * 10);

        if (proxyIP && !serverinfoBannedProxies.has(proxyIP)) {
          let proxyData = serverinfoProxyRate.get(proxyIP);
          if (!proxyData || now - proxyData.reset > SERVERINFO_PROXY_TTL) {
            proxyData = { count: 1, reset: now + SERVERINFO_PROXY_TTL, malformedCount: 1 };
            serverinfoProxyRate.set(proxyIP, proxyData);
            console.warn(`[SERVERINFO_BLOCK] First malformed /serverinfo from proxy ${proxyIP}`);
          } else {
            proxyData.malformedCount = (proxyData.malformedCount || 0) + 1;
            if (proxyData.malformedCount > 50) {
              console.warn(`[SERVERINFO_BAN] Proxy ${proxyIP} sent ${proxyData.malformedCount} malformed /serverinfo requests. Banning for 1 hour.`);
              serverinfoBannedProxies.add(proxyIP);
              setTimeout(() => {
                serverinfoBannedProxies.delete(proxyIP);
              }, 3600000);
            }
          }
        }

        if (!res.headersSent) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
        }
        return;
      }

      const tokenMatch = req.url.match(/[?&]token=([^&]+)/);
      const authHeader = req.headers['authorization'];
      const token = tokenMatch ? tokenMatch[1] : (authHeader ? authHeader.replace('Bearer ', '') : null);

      if (token && validateApiToken(token)) {
      } else {
        if (!req.url.includes('?')) {
          bannedIPs.add(clientIP);
          setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION * 10);
          if (!res.headersSent) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
          }
          return;
        }

        // Validate timestamp freshness
        const queryMatch = req.url.match(/\?(\d+)/);
        if (queryMatch) {
          const timestamp = parseInt(queryMatch[1], 10);
          const timeDiff = Math.abs(now - timestamp);
          const MAX_TIME_DIFF = 120000;

          if (timeDiff > MAX_TIME_DIFF) {
            let failData = timestampFailures.get(clientIP);
            if (!failData || now - failData.firstFail > TIMESTAMP_FAIL_WINDOW) {
              failData = { count: 1, firstFail: now };
              timestampFailures.set(clientIP, failData);
            } else {
              failData.count++;
            }

            if (failData.count >= TIMESTAMP_FAIL_THRESHOLD) {
              console.warn(`[SERVERINFO_BLOCK] IP ${clientIP} sent /serverinfo with invalid timestamp ${failData.count} times (diff: ${timeDiff}ms). Blocking.`);
              bannedIPs.add(clientIP);
              setTimeout(() => { bannedIPs.delete(clientIP); timestampFailures.delete(clientIP); }, TEMP_BAN_DURATION * 10);
              if (!res.headersSent) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
              }
              return;
            } else {
              if (!res.headersSent) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
              }
              return;
            }
          }
        }
      }

      if (!token || !validateApiToken(token)) {
        // Apply rate limiting only if no valid token
        if (proxyIP && serverinfoBannedProxies.has(proxyIP)) {
          console.warn(`[SERVERINFO_BLOCK] Banned proxy ${proxyIP} attempted /serverinfo request.`);
          if (!res.headersSent) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
          }
          return;
        }

        let ipData = serverinfoIpRate.get(clientIP);
        if (!ipData || now > ipData.reset) {
          ipData = { count: 1, reset: now + SERVERINFO_IP_TTL, burstCount: 1, burstReset: now + SERVERINFO_BURST_TTL };
          serverinfoIpRate.set(clientIP, ipData);
        } else {
          ipData.count++;
          if (now > ipData.burstReset) {
            ipData.burstCount = 1;
            ipData.burstReset = now + SERVERINFO_BURST_TTL;
          } else {
            ipData.burstCount++;
          }

          if (ipData.count > SERVERINFO_IP_LIMIT) {
            console.warn(`[SERVERINFO_BAN] IP ${clientIP} exceeded /serverinfo rate (${ipData.count}/${SERVERINFO_IP_TTL/1000}s). Banning.`);
            bannedIPs.add(clientIP);
            setTimeout(() => { bannedIPs.delete(clientIP); serverinfoIpRate.delete(clientIP); }, TEMP_BAN_DURATION * 5);
            if (!res.headersSent) {
              res.writeHead(429, { 'Content-Type': 'text/plain' });
              res.end('Too Many Requests');
            }
            return;
          }

          if (ipData.burstCount > SERVERINFO_BURST_LIMIT) {
            console.warn(`[SERVERINFO_BAN] IP ${clientIP} exceeded /serverinfo burst limit (${ipData.burstCount}/${SERVERINFO_BURST_TTL/1000}s). Banning.`);
            bannedIPs.add(clientIP);
            setTimeout(() => { bannedIPs.delete(clientIP); serverinfoIpRate.delete(clientIP); }, TEMP_BAN_DURATION * 2);
            if (!res.headersSent) {
              res.writeHead(429, { 'Content-Type': 'text/plain' });
              res.end('Too Many Requests');
            }
            return;
          }
        }

        if (proxyIP) {
          let proxyData = serverinfoProxyRate.get(proxyIP);
          if (!proxyData || now > proxyData.reset) {
            proxyData = { count: 1, reset: now + SERVERINFO_PROXY_TTL };
            serverinfoProxyRate.set(proxyIP, proxyData);
          } else {
            proxyData.count++;
            if (proxyData.count > SERVERINFO_PROXY_LIMIT) {
              console.warn(`[SERVERINFO_BAN] Proxy ${proxyIP} exceeded /serverinfo rate (${proxyData.count}/${SERVERINFO_PROXY_TTL/1000}s). Temporarily banning for 5 minutes.`);
              serverinfoBannedProxies.add(proxyIP);
              setTimeout(() => {
                serverinfoBannedProxies.delete(proxyIP);
              }, 300000);
              if (!res.headersSent) {
                res.writeHead(429, { 'Content-Type': 'text/plain' });
                res.end('Too Many Requests');
              }
              return;
            }
          }
        }
      }

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

    if (req.method === 'GET' && req.url && req.url.startsWith('/games/ping')) {
      const now = Date.now();
      const xForwardedFor = req.headers['x-forwarded-for'];
      const proxyIP = xForwardedFor ? xForwardedFor.split(',').map(s => s.trim()).pop() : null;

      const malformedMatch = req.url.match(/^\/games\/ping\d+/);
      if (malformedMatch) {
        bannedIPs.add(clientIP);
        setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION * 10);

        if (proxyIP && !endpointBannedProxies.has(proxyIP)) {
          let proxyData = endpointProxyRate.get(proxyIP);
          if (!proxyData || now - proxyData.reset > ENDPOINT_PROXY_TTL) {
            proxyData = { count: 1, reset: now + ENDPOINT_PROXY_TTL, malformedCount: 1 };
            endpointProxyRate.set(proxyIP, proxyData);
            console.warn(`[GAMESPING_BLOCK] First malformed /games/ping from proxy ${proxyIP}`);
          } else {
            proxyData.malformedCount = (proxyData.malformedCount || 0) + 1;
            if (proxyData.malformedCount > 50) {
              console.warn(`[GAMESPING_BAN] Proxy ${proxyIP} sent ${proxyData.malformedCount} malformed /games/ping requests. Banning for 1 hour.`);
              endpointBannedProxies.add(proxyIP);
              setTimeout(() => {
                endpointBannedProxies.delete(proxyIP);
              }, 3600000);
            }
          }
        }

        if (!res.headersSent) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
        }
        return;
      }

      const tokenMatch = req.url.match(/[?&]token=([^&]+)/);
      const authHeader = req.headers['authorization'];
      const token = tokenMatch ? tokenMatch[1] : (authHeader ? authHeader.replace('Bearer ', '') : null);

      if (token && validateApiToken(token)) {
      } else {
        if (!req.url.includes('?')) {
          bannedIPs.add(clientIP);
          setTimeout(() => { bannedIPs.delete(clientIP); }, TEMP_BAN_DURATION * 10);
          if (!res.headersSent) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
          }
          return;
        }

        const queryMatch = req.url.match(/\?(\d+)/);
        if (queryMatch) {
          const timestamp = parseInt(queryMatch[1], 10);
          const timeDiff = Math.abs(now - timestamp);
          const MAX_TIME_DIFF = 120000;

          if (timeDiff > MAX_TIME_DIFF) {
            let failData = timestampFailures.get(clientIP);
            if (!failData || now - failData.firstFail > TIMESTAMP_FAIL_WINDOW) {
              failData = { count: 1, firstFail: now };
              timestampFailures.set(clientIP, failData);
            } else {
              failData.count++;
            }

            if (failData.count >= TIMESTAMP_FAIL_THRESHOLD) {
              console.warn(`[GAMESPING_BLOCK] IP ${clientIP} sent /games/ping with invalid timestamp ${failData.count} times (diff: ${timeDiff}ms). Blocking.`);
              bannedIPs.add(clientIP);
              setTimeout(() => { bannedIPs.delete(clientIP); timestampFailures.delete(clientIP); }, TEMP_BAN_DURATION * 10);
              if (!res.headersSent) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
              }
              return;
            } else {
              if (!res.headersSent) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
              }
              return;
            }
          }
        }
      }

      if (!token || !validateApiToken(token)) {
        // Apply rate limiting only if no valid token
        if (proxyIP && endpointBannedProxies.has(proxyIP)) {
          console.warn(`[GAMESPING_BLOCK] Banned proxy ${proxyIP} attempted /games/ping request.`);
          if (!res.headersSent) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
          }
          return;
        }

        let ipData = endpointIpRate.get(clientIP);
        if (!ipData || now > ipData.reset) {
          ipData = { count: 1, reset: now + ENDPOINT_IP_TTL, burstCount: 1, burstReset: now + ENDPOINT_BURST_TTL };
          endpointIpRate.set(clientIP, ipData);
        } else {
          ipData.count++;
          if (now > ipData.burstReset) {
            ipData.burstCount = 1;
            ipData.burstReset = now + ENDPOINT_BURST_TTL;
          } else {
            ipData.burstCount++;
          }

          if (ipData.count > ENDPOINT_IP_LIMIT) {
            console.warn(`[GAMESPING_BAN] IP ${clientIP} exceeded /games/ping rate (${ipData.count}/${ENDPOINT_IP_TTL/1000}s). Banning.`);
            bannedIPs.add(clientIP);
            setTimeout(() => { bannedIPs.delete(clientIP); endpointIpRate.delete(clientIP); }, TEMP_BAN_DURATION * 5);
            if (!res.headersSent) {
              res.writeHead(429, { 'Content-Type': 'text/plain' });
              res.end('Too Many Requests');
            }
            return;
          }

          if (ipData.burstCount > ENDPOINT_BURST_LIMIT) {
            console.warn(`[GAMESPING_BAN] IP ${clientIP} exceeded /games/ping burst limit (${ipData.burstCount}/${ENDPOINT_BURST_TTL/1000}s). Banning.`);
            bannedIPs.add(clientIP);
            setTimeout(() => { bannedIPs.delete(clientIP); endpointIpRate.delete(clientIP); }, TEMP_BAN_DURATION * 2);
            if (!res.headersSent) {
              res.writeHead(429, { 'Content-Type': 'text/plain' });
              res.end('Too Many Requests');
            }
            return;
          }
        }

        if (proxyIP) {
          let proxyData = endpointProxyRate.get(proxyIP);
          if (!proxyData || now > proxyData.reset) {
            proxyData = { count: 1, reset: now + ENDPOINT_PROXY_TTL };
            endpointProxyRate.set(proxyIP, proxyData);
          } else {
            proxyData.count++;
            if (proxyData.count > ENDPOINT_PROXY_LIMIT) {
              console.warn(`[GAMESPING_BAN] Proxy ${proxyIP} exceeded /games/ping rate (${proxyData.count}/${ENDPOINT_PROXY_TTL/1000}s). Temporarily banning for 5 minutes.`);
              endpointBannedProxies.add(proxyIP);
              setTimeout(() => {
                endpointBannedProxies.delete(proxyIP);
              }, 300000);
              if (!res.headersSent) {
                res.writeHead(429, { 'Content-Type': 'text/plain' });
                res.end('Too Many Requests');
              }
              return;
            }
          }
        }
      }
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
    if (cur >= CONCURRENT_CONN_LIMIT) {
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

  for (const [ip, stats] of protobufErrorCounts) {
    if (now - stats.firstError > ERROR_WINDOW) {
      protobufErrorCounts.delete(ip);
    }
  }

  for (const [ip, data] of homepageIpRate) {
    if (now > data.reset) homepageIpRate.delete(ip);
  }

  for (const [ip, data] of serverinfoIpRate) {
    if (now > data.reset && now > data.burstReset) serverinfoIpRate.delete(ip);
  }

  for (const [proxyIP, data] of serverinfoProxyRate) {
    if (now > data.reset) serverinfoProxyRate.delete(proxyIP);
  }

  for (const [ip, data] of endpointIpRate) {
    if (now > data.reset && now > data.burstReset) endpointIpRate.delete(ip);
  }

  for (const [proxyIP, data] of endpointProxyRate) {
    if (now > data.reset) endpointProxyRate.delete(proxyIP);
  }

  for (const [ip, data] of timestampFailures) {
    if (now - data.firstFail > TIMESTAMP_FAIL_WINDOW) timestampFailures.delete(ip);
  }
}, 60000);

// Start the server
server.listen(process.env.PORT || 80, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT || 80}`);
  console.log('[SECURITY] Header protection enabled with max size: 8KB');
  console.log('[SECURITY] Rate limiting enabled: 60 req/min');
  console.log('[SECURITY] WebSocket handling improved');
});