import { task } from "hardhat/config";
import { deployContract } from "./utils/deploy.js";

task("deploy", "Deploy Whal-E contracts")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    console.log("🚀 Deploying Whal-E Contracts to BSC Testnet...\n");
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("📍 Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "tBNB\n");
    
    // BSC Testnet PancakeSwap V3 addresses
    const SWAP_ROUTER = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
    const AGENT_ADDRESS = deployer.address;
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
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📊 Summary:");
    console.log("  Factory:", factoryAddress);
    console.log("  Test Wallet:", testWallet);
    console.log("\n🔍 Verify on BscScan:");
    console.log("  https://testnet.bscscan.com/address/" + factoryAddress);
    
    return addresses;
  });
