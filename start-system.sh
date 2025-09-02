#!/bin/bash

echo "========================================"
echo "Blockchain Land Registry System"
echo "========================================"
echo

echo "Starting the complete system..."
echo

echo "1. Starting Docker services (PostgreSQL, IPFS, Fabric)..."
docker-compose up -d postgres ipfs fabric-ca fabric-orderer fabric-peer

echo
echo "2. Waiting for services to be ready..."
sleep 10

echo
echo "3. Setting up database..."
cd backend
cp env.example .env
npm install
npm run setup

echo
echo "4. Starting backend server..."
gnome-terminal -- bash -c "npm run dev; exec bash" 2>/dev/null || \
xterm -e "npm run dev" 2>/dev/null || \
echo "Please start backend manually: cd backend && npm run dev"

echo
echo "5. Starting frontend application..."
cd ../frontend
npm install
gnome-terminal -- bash -c "npm start; exec bash" 2>/dev/null || \
xterm -e "npm start" 2>/dev/null || \
echo "Please start frontend manually: cd frontend && npm start"

echo
echo "========================================"
echo "System is starting up!"
echo "========================================"
echo
echo "Backend API: http://localhost:3001"
echo "Frontend App: http://localhost:3000"
echo "IPFS Gateway: http://localhost:8080"
echo
echo "Default login credentials:"
echo "Admin: admin@landregistry.com / admin123"
echo "Government: gov@landregistry.com / gov123"
echo "Bank: bank@landregistry.com / bank123"
echo "Citizen: citizen@example.com / citizen123"
echo "Legal: legal@example.com / legal123"
echo
echo "Press Enter to exit..."
read
