#!/bin/bash

# This script updates the project and restarts the server

# Display a banner
cat << "EOF"
                           _ _           _   _   _        _
 _____      _____  _ __ __| | |__   __ _| |_| |_| | ___  (_) ___
/ __\ \ /\ / / _ \| '__/ _` | '_ \ / _` | __| __| |/ _ \ | |/ _ \
\__ \\ V  V / (_) | | | (_| | |_) | (_| | |_| |_| |  __/_| | (_) |
|___/ \_/\_/ \___/|_|  \__,_|_.__/ \__,_|\__|\__|_|\___(_)_|\___/

A game by Gautam
EOF

npm i -g pm2

# Pull the latest changes from the repository
echo "Pulling latest changes..."
git pull

# Stop all running forever/pm2 processes
echo "Stopping all processes..."
forever stopall
pm2 stop all

# Start the server
# echo "Starting the server..."
# cd server
# yarn install
# # yarn run foreverprod
# pm2 start src/index.js --name "server"
# cd ..

# Start the API
echo "Starting the API..."
cd api
yarn install
yarn build
# yarn run foreverprod
pm2 start dist/main.js --name "api"
cd ..

echo "Update completed successfully!"
