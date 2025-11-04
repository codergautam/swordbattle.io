#!/bin/bash

echo "Starting Heroku deployment"

# Set maximum HTTP header size to prevent oversized header DoS attacks
export NODE_OPTIONS="--max-http-header-size=8192"

export API_PORT=3000
export SERVER_PORT=8080

(
  cd api
  echo "Building API..."
  echo "Starting processes with PM2..."
  pm2 start node --name api -- dist/main
)

(
  cd server
  pm2 start yarn --name server -- start
)

echo "Deployment complete"
echo "Starting proxy server..."

# Start proxy with increased file descriptors and max old space size
NODE_OPTIONS="--max-http-header-size=8192 --max-old-space-size=2048" pm2 start prod-proxy.js --name proxy --node-args="--max-http-header-size=8192" -- --max-old-space-size=2048
ulimit -n 65536 # Increase max file descriptors
pm2 logs
