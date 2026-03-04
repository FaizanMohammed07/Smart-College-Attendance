#!/bin/bash

# Setup script for the Attendance System
echo "=================================="
echo "Attendance System Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js v18+ from https://nodejs.org${NC}"
    exit 1
fi

# Check MongoDB
echo -e "${YELLOW}Checking MongoDB...${NC}"
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB is installed${NC}"
else
    echo -e "${YELLOW}! MongoDB not found locally${NC}"
    echo -e "${YELLOW}  The backend will use MongoDB Atlas (already configured)${NC}"
fi

echo ""
echo -e "${YELLOW}Installing Backend Dependencies...${NC}"
cd backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Backend installation failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Installing Frontend Dependencies...${NC}"
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Frontend installation failed${NC}"
    exit 1
fi

cd ..

echo ""
echo "=================================="
echo -e "${GREEN}Setup Complete! ✓${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}To start the application:${NC}"
echo ""
echo "1. Start Backend (in one terminal):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open browser to: http://localhost:5173"
echo ""
echo "See QUICKSTART.md for detailed instructions"
echo ""
