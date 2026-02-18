#!/bin/bash

# Whal-E Quick Deploy Script
# Usage: ./deploy.sh

set -e

echo "🐋 Whal-E BNB - Quick Deploy Script"
echo "====================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Deploy Smart Contracts
echo "📦 Step 1: Deploying Smart Contracts..."
cd contracts

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found in contracts/"
    echo "Please create .env with:"
    echo "  PRIVATE_KEY=your_key"
    echo "  ALCHEMY_RPC_URL=your_rpc"
    exit 1
fi

echo "Installing dependencies..."
npm install --silent

echo "Compiling contracts..."
npx hardhat compile

echo "Deploying to BSC Testnet..."
npx hardhat run deploy/deploy.js --network bscTestnet

echo "✅ Contracts deployed!"
echo ""

# Deploy Subgraph
echo "📊 Step 2: Deploying Subgraph..."
cd ../subgraph

if ! command -v graph &> /dev/null; then
    echo "Installing Graph CLI..."
    npm install -g @graphprotocol/graph-cli
fi

echo "Authenticating with Studio..."
graph auth --studio 3fbc1a906d2928f0e6928d973ef22bf5

echo "Generating code..."
graph codegen

echo "Building..."
graph build

echo "Deploying..."
graph deploy --studio whal-e

echo "✅ Subgraph deployed!"
echo ""

# Start Backend
echo "🚀 Step 3: Starting Backend..."
cd ../backend

echo "Installing dependencies..."
npm install --silent

echo "Building..."
npm run build

echo "Starting server..."
echo "Backend will run on http://localhost:3000"
echo "Press Ctrl+C to stop"
npm run start:prod

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Next steps:"
echo "1. Check contract addresses in bsc.address"
echo "2. Test API at http://localhost:3000/health"
echo "3. Deploy frontend to Vercel"
echo "4. Submit to DoraHacks"
