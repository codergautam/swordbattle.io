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

# Start proxy with NODE_OPTIONS explicitly set
NODE_OPTIONS="--max-http-header-size=8192" pm2 start prod-proxy.js --name proxy
pm2 logs
