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

# Pull the latest changes from the repository
echo "Pulling latest changes..."
git pull

# Stop all running forever processes
echo "Stopping all forever processes..."
forever stopall

# Start the server
echo "Starting the server..."
cd server
yarn install
yarn run foreverprod
cd ..

# Start the API
echo "Starting the API..."
cd api
yarn install
yarn run foreverprod
cd ..

echo "Update completed successfully!"
