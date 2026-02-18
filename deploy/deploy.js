const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🚀 Deploying Whal-E Contracts to BSC Testnet...\n");
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "tBNB\n");
  
  // BSC Testnet PancakeSwap V3 addresses
  const SWAP_ROUTER = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
  const AGENT_ADDRESS = deployer.address; // Deployer is the agent for now
  const FEE_RECIPIENT = deployer.address;
  
  console.log("📋 Configuration:");
  console.log("  Swap Router:", SWAP_ROUTER);
  console.log("  Agent:", AGENT_ADDRESS);
  console.log("  Fee Recipient:", FEE_RECIPIENT);
  console.log();
  
  // Deploy Factory
  console.log("📦 Deploying WhalEFactory...");
  const WhalEFactory = await ethers.getContractFactory("WhalEFactory");
  const factory = await WhalEFactory.deploy(
    SWAP_ROUTER,
    AGENT_ADDRESS,
    FEE_RECIPIENT
  );
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ WhalEFactory deployed to:", factoryAddress);
  console.log("   Transaction:", factory.deploymentTransaction().hash);
  console.log();
  
  // Create a test wallet
  console.log("🧪 Creating test trading wallet...");
  const createTx = await factory.createWallet({ value: 0 });
  await createTx.wait();
  
  const testWallet = await factory.getWallet(deployer.address);
  console.log("✅ Test wallet created:", testWallet);
  console.log();
  
  // Save addresses
  const addresses = {
    network: "bsc-testnet",
    chainId: 97,
    factory: factoryAddress,
    swapRouter: SWAP_ROUTER,
    testWallet: testWallet,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './bsc.address',
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("📝 Addresses saved to bsc.address");
  console.log();
  console.log("=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log();
  console.log("📊 Summary:");
  console.log("  Factory:", factoryAddress);
  console.log("  Test Wallet:", testWallet);
  console.log();
  console.log("🔍 Verify on BscScan:");
  console.log("  https://testnet.bscscan.com/address/" + factoryAddress);
  console.log();
  
  // Check remaining balance
  const remainingBalance = await ethers.provider.getBalance(deployer.address);
  const spent = balance - remainingBalance;
  console.log("💸 Gas spent:", ethers.formatEther(spent), "tBNB");
  console.log("💰 Remaining:", ethers.formatEther(remainingBalance), "tBNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
