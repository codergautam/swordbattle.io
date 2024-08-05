#!/bin/bash

cat << "EOF"
                           _ _           _   _   _        _
 _____      _____  _ __ __| | |__   __ _| |_| |_| | ___  (_) ___
/ __\ \ /\ / / _ \| '__/ _` | '_ \ / _` | __| __| |/ _ \ | |/ _ \
\__ \\ V  V / (_) | | | (_| | |_) | (_| | |_| |_| |  __/_| | (_) |
|___/ \_/\_/ \___/|_|  \__,_|_.__/ \__,_|\__|\__|_|\___(_)_|\___/

Heroku deployment script
EOF

echo "Installing dependencies"
cd api
yarn install

cd ../server
yarn install

cd ..

# Start API process
cd api
echo "Building API..."
npx @nestjs/cli build
# run node dist/main in background
echo "Starting processes with PM2..."
pm2 start node --name api -- dist/main

# Start server process
cd ../server
# run yarn start in background
pm2 start yarn --name server --interpreter bash -- start

# Ensure pm2 keeps running
pm2 logs
