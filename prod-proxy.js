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

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  const host = req.headers.host;

  if (host === 'api.swordbattle.io') {
    // Proxy WebSocket requests to the API
    apiProxy.ws(req, socket, head);
  } else if (host === 'na.swordbattle.io') {
    // Proxy WebSocket requests to the main server
    mainProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Reverse proxy server running on port ${process.env.PORT}`);
});
