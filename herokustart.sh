#!/bin/bash

echo "Starting Heroku deployment"

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

pm2 start prod-proxy.js --name proxy
pm2 logs
