#!/bin/bash

echo "Starting deployment..."

cd /home/rohith/lazplay || exit

echo "Pulling latest code..."
git pull origin main

echo "Installing backend dependencies & generating client..."
cd backend || exit
npm install
npx prisma generate
npm run db:sync

echo "Restarting backend..."
pm2 restart lazplay-backend || pm2 start src/server.js --name lazplay-backend

echo "Building frontend..."
cd ../frontend || exit
npm install
npm run build

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Deployment completed!"