const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server for the API
const apiProxy = httpProxy.createProxyServer({ target: 'http://localhost:3000', ws: true });

// Create a proxy server for the main server
const mainProxy = httpProxy.createProxyServer({ target: 'http://localhost:8080', ws: true });

// Create an HTTP server to handle incoming requests
const server = http.createServer((req, res) => {
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
});

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

// Also guard 'clientError' on the HTTP server
server.on('clientError', (err, socket) => {
  console.error('HTTP server clientError:', err);
  try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch (e) {}
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT}`);
});
