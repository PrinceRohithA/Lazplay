#!/bin/bash

echo "Starting deployment..."

cd /home/rohith/your-project || exit

echo "Pulling latest code..."
git pull origin main

echo "Installing backend dependencies..."
cd backend || exit
npm install

echo "Restarting backend..."
pm2 restart backend || pm2 start index.js --name backend

echo "Building frontend..."
cd ../frontend || exit
npm install
npm run build

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Deployment completed!"