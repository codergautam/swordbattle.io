#!/bin/bash

cat << "EOF"
                           _ _           _   _   _        _
 _____      _____  _ __ __| | |__   __ _| |_| |_| | ___  (_) ___
/ __\ \ /\ / / _ \| '__/ _` | '_ \ / _` | __| __| |/ _ \ | |/ _ \
\__ \\ V  V / (_) | | | (_| | |_) | (_| | |_| |_| |  __/_| | (_) |
|___/ \_/\_/ \___/|_|  \__,_|_.__/ \__,_|\__|\__|_|\___(_)_|\___/

Heroku deployment script
EOF

echo "Installing dependencies..."
cd api
yarn install

cd ../server
yarn install

echo "Starting processes with PM2..."

# Start API process
pm2 start "yarn --cwd api start" --name api-process

# Start game server process
pm2 start "yarn --cwd server start" --name game-process

# Ensure pm2 keeps running
pm2 logs
