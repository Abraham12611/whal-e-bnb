// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TradingWallet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WhalEFactory
 * @notice Factory for creating TradingWallet instances
 * @dev Users call createWallet() to get their own copy-trading wallet
 */
contract WhalEFactory is Ownable {
    // Contract references
    address public immutable swapRouter;
    address public whalEAgent;
    
    // Wallet tracking
    mapping(address => address) public userWallets;
    address[] public allWallets;
    mapping(address => bool) public isWhaleEWallet;
    
    // Protocol parameters
    uint256 public creationFee;
    uint256 public performanceFee; // In basis points (e.g., 100 = 1%)
    address public feeRecipient;
    
    // Events
    event WalletCreated(
        address indexed user,
        address indexed wallet,
        uint256 timestamp
    );
    
    event AgentUpdated(
        address indexed oldAgent,
        address indexed newAgent
    );
    
    event FeesUpdated(
        uint256 creationFee,
        uint256 performanceFee
    );
    
    event FeeRecipientUpdated(
        address indexed newRecipient
    );
    
    event FundsWithdrawn(
        address indexed token,
        uint256 amount
    );
    
    // Modifiers
    modifier validAddress(address _addr) {
        require(_addr != address(0), "WhalEFactory: Invalid address");
        _;
    }
    
    constructor(
        address _swapRouter,
        address _agent,
        address _feeRecipient
    ) validAddress(_swapRouter) validAddress(_agent) validAddress(_feeRecipient) {
        swapRouter = _swapRouter;
        whalEAgent = _agent;
        feeRecipient = _feeRecipient;
        
        creationFee = 0; // Free for hackathon
        performanceFee = 100; // 1% default
    }
    
    /**
     * @notice Create a new trading wallet for the caller
     * @return wallet Address of the created wallet
     */
    function createWallet() external payable returns (address wallet) {
        require(msg.value >= creationFee, "WhalEFactory: Insufficient fee");
        require(userWallets[msg.sender] == address(0), "WhalEFactory: Wallet exists");
        
        // Deploy new wallet
        wallet = address(new TradingWallet(swapRouter, whalEAgent, msg.sender));
        
        // Track wallet
        userWallets[msg.sender] = wallet;
        allWallets.push(wallet);
        isWhaleEWallet[wallet] = true;
        
        emit WalletCreated(msg.sender, wallet, block.timestamp);
        
        return wallet;
    }
    
    /**
     * @notice Get wallet address for a user
     * @param user User address
     * @return wallet Wallet address (0 if none)
     */
    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }
    
    /**
     * @notice Check if address is a Whal-E wallet
     * @param wallet Address to check
     * @return isWallet True if it's a Whal-E wallet
     */
    function isWallet(address wallet) external view returns (bool) {
        return isWhaleEWallet[wallet];
    }
    
    /**
     * @notice Get total number of wallets created
     * @return count Number of wallets
     */
    function getWalletCount() external view returns (uint256) {
        return allWallets.length;
    }
    
    /**
     * @notice Get wallets in range (for pagination)
     * @param start Start index
     * @param limit Maximum to return
     * @return wallets Array of wallet addresses
     */
    function getWallets(
        uint256 start,
        uint256 limit
    ) external view returns (address[] memory) {
        uint256 end = start + limit;
        if (end > allWallets.length) {
            end = allWallets.length;
        }
        
        address[] memory wallets = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            wallets[i - start] = allWallets[i];
        }
        
        return wallets;
    }
    
    /**
     * @notice Update the Whal-E agent address
     * @param _newAgent New agent address
     */
    function setAgent(address _newAgent) external onlyOwner validAddress(_newAgent) {
        address oldAgent = whalEAgent;
        whalEAgent = _newAgent;
        emit AgentUpdated(oldAgent, _newAgent);
    }
    
    /**
     * @notice Update fee parameters
     * @param _creationFee New creation fee
     * @param _performanceFee New performance fee (basis points)
     */
    function setFees(
        uint256 _creationFee,
        uint256 _performanceFee
    ) external onlyOwner {
        require(_performanceFee <= 1000, "WhalEFactory: Max 10% performance fee");
        creationFee = _creationFee;
        performanceFee = _performanceFee;
        emit FeesUpdated(_creationFee, _performanceFee);
    }
    
    /**
     * @notice Update fee recipient
     * @param _recipient New recipient address
     */
    function setFeeRecipient(
        address _recipient
    ) external onlyOwner validAddress(_recipient) {
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(_recipient);
    }
    
    /**
     * @notice Withdraw collected fees
     * @param token Token to withdraw (address(0) for BNB)
     * @param amount Amount to withdraw
     */
    function withdrawFees(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) {
            payable(feeRecipient).transfer(amount);
        } else {
            IERC20(token).transfer(feeRecipient, amount);
        }
        emit FundsWithdrawn(token, amount);
    }
    
    /**
     * @notice Get total value locked across all wallets
     * @dev Returns sum of balances in a specific token
     * @param token Token to check
     * @return totalTVL Total value locked
     */
    function getTotalTVL(address token) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < allWallets.length; i++) {
            total += IERC20(token).balanceOf(allWallets[i]);
        }
        return total;
    }
    
    /**
     * @notice Emergency: Pause wallet creation
     */
    function pauseCreation() external onlyOwner {
        creationFee = type(uint256).max;
    }
    
    /**
     * @notice Emergency: Resume wallet creation
     */
    function resumeCreation(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
    }
    
    receive() external payable {}
}
