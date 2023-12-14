#!/bin/bash
echo "Update Cosmetics Script for Swordbattle.io.\nThis will delete cosmetics.json caches in client\\src\\game and api\\src"
read -p "Press any key to continue... " -n1 -s
echo

echo "Starting script..."

echo "Deleting client/src/game/cosmetics.json..."
if [ -f client/src/game/cosmetics.json ]; then
    rm client/src/game/cosmetics.json
    echo "Deleted successfully."
else
    echo "File not found."
fi

echo "Deleting server/src/cosmetics.json..."
if [ -f server/src/cosmetics.json ]; then
    rm server/src/cosmetics.json
    echo "Deleted successfully."
else
    echo "File not found."
fi

echo "Deleting api/src/cosmetics.json..."
if [ -f api/src/cosmetics.json ]; then
    rm api/src/cosmetics.json
    echo "Deleted successfully."
else
    echo "File not found."
fi

echo "Copying new cosmetics.json to client/src/game..."
cp cosmetics.json client/src/game/cosmetics.json
echo "Copy complete."

echo "Copying new cosmetics.json to server/src..."
cp cosmetics.json server/src/cosmetics.json
echo "Copy complete."

echo "Copying new cosmetics.json to api/src..."
cp cosmetics.json api/src/cosmetics.json
echo "Copy complete."

echo "Script completed."