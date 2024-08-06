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
  pm2 start yarn --name server --interpreter bash -- start
)

# Touch /tmp/app-initialized when the backend is ready for traffic.
# This is used by Heroku to determine if the app is ready.
touch /tmp/app-initialized

pm2 logs
