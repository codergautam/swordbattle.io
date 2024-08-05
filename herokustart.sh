export API_PORT=3000
export SERVER_PORT=8080
cd api
echo "Building API..."
yarn build
# run node dist/main in background
echo "Starting processes with PM2..."
pm2 start node --name api -- dist/main

# Start server process
cd ../server
# run yarn start in background
pm2 start yarn --name server --interpreter bash -- start

# Ensure pm2 keeps running
pm2 logs