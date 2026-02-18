# 🐋 Whal-E BNB

**AI-Powered Whale Intelligence & Copy-Trading Agent for BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![BNB Chain](https://img.shields.io/badge/BNB%20Chain-Testnet-green)](https://testnet.bscscan.com)

## 🎯 Overview

Whal-E is an autonomous AI agent that discovers high-performing "whale" wallets on BNB Chain, analyzes their trading patterns, and automatically copies their trades with intelligent risk management.

### Key Features

- 🤖 **AI Analysis**: Evaluates whale trades using GPT models via OpenRouter
- 🔍 **Whale Discovery**: Continuously scans BSC for profitable traders
- 💰 **Copy Trading**: Automatically replicates successful trades
- ⚡ **Risk Management**: Stop-loss, position sizing, daily limits
- 📊 **Real-time Tracking**: Subgraph indexing for fast queries

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WHAL-E BNB                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js) ←→ Backend (NestJS) ←→ Smart Contracts     │
│       ↓                        ↓                        ↓      │
│  User Dashboard         AI Analysis             TradingWallet   │
│  Wallet Connection      OpenRouter              Factory         │
│                        Whale Discovery                        │
│                        Subgraph/TheGraph                      │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
whale-bnb/
├── contracts/          # Hardhat smart contracts
│   ├── TradingWallet.sol
│   ├── WhalEFactory.sol
│   └── ...
├── subgraph/           # TheGraph subgraph
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/mappings/
├── backend/            # NestJS API
│   ├── src/
│   │   ├── ai-analysis/
│   │   ├── whale-discovery/
│   │   └── ...
│   └── package.json
├── frontend/           # Next.js frontend (TODO)
├── docs/               # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- BNB Chain testnet tBNB

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/whal-e-bnb.git
cd whal-e-bnb
```

2. **Install dependencies**
```bash
# Contracts
cd contracts && npm install

# Backend
cd ../backend && npm install

# Subgraph
cd ../subgraph && npm install
```

3. **Configure environment**
```bash
# Copy .env file
cp .env.example .env

# Edit .env with your keys:
# - PRIVATE_KEY (with tBNB)
# - OPENROUTER_API_KEY
# - ALCHEMY_RPC_URL
```

### Deploy Smart Contracts

```bash
cd contracts

# Compile
npx hardhat compile

# Deploy to BSC Testnet
npx hardhat run deploy/deploy.js --network bscTestnet
```

### Deploy Subgraph

```bash
cd subgraph

# Authenticate
graph auth --studio YOUR_DEPLOY_KEY

# Deploy
graph codegen && graph build
graph deploy --studio whal-e
```

### Run Backend

```bash
cd backend

# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🔧 Configuration

### BSC Testnet

- **RPC URL**: `https://bnb-testnet.g.alchemy.com/v2/YOUR_KEY`
- **Chain ID**: 97
- **Faucet**: https://www.bnbchain.org/en/testnet-faucet
- **Explorer**: https://testnet.bscscan.com

### PancakeSwap V3 Contracts

| Contract | Address |
|----------|---------|
| Factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` |
| SwapRouter | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` |
| Permit2 | `0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768` |

## 🧪 Testing

### Smart Contracts
```bash
cd contracts
npx hardhat test
```

### Backend
```bash
cd backend
npm run test
```

### Subgraph
```bash
cd subgraph
npm run test
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Get Top Whales
```
GET /whales?limit=10
```

### Get Whale Details
```
GET /whales/:address
```

### Analyze Trade
```
POST /analyze
{
  "whaleAddress": "0x...",
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amount": 1000,
  "userBalance": 5000
}
```

## 🤖 AI Integration

Whal-E uses **OpenRouter** for AI analysis with free models:

- `deepseek/deepseek-r1-0528:free` - Deep reasoning
- `qwen/qwen3-vl-235b-a22b-thinking` - Analysis
- `openai/gpt-oss-120b:free` - General purpose

The AI evaluates trades based on:
- Whale's historical win rate
- Trade size and slippage
- Portfolio correlation
- Market conditions
- Risk tolerance

## 📝 Documentation

- [Project Overview](docs/PROJECT.md)
- [Technical Documentation](docs/TECHNICAL.md)
- [AI Build Log](docs/AI_BUILD_LOG.md)

## 🔗 Contract Addresses (BSC Testnet)

| Contract | Address |
|----------|---------|
| WhalEFactory | `0x...` (after deployment) |
| Sample TradingWallet | `0x...` (after deployment) |

See [bsc.address](bsc.address) for deployed addresses.

## 🎥 Demo

[Watch Demo Video](https://your-demo-link.com)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [BNB Chain](https://bnbchain.org) - For the hackathon opportunity
- [PancakeSwap](https://pancakeswap.finance) - DEX infrastructure
- [TheGraph](https://thegraph.com) - Indexing protocol
- [OpenRouter](https://openrouter.ai) - Free AI models

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/your-username/whal-e-bnb/issues)
- Discord: #vibe-coding channel

---

**Built with ❤️ for the Good Vibes Only: OpenClaw Edition Hackathon**
