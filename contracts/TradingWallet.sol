// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title TradingWallet
 * @notice Individual trading wallet managed by Whal-E agent
 * @dev Each user gets their own copy-trading wallet
 */
contract TradingWallet is Ownable, ReentrancyGuard {
    ISwapRouter public immutable swapRouter;
    address public immutable whalEAgent;
    
    // Trade tracking
    uint256 public tradeCounter;
    mapping(bytes32 => Trade) public pendingTrades;
    mapping(bytes32 => Trade) public executedTrades;
    
    // Risk management
    uint256 public maxDailyLoss; // In basis points (e.g., 500 = 5%)
    uint256 public dailyLoss;
    uint256 public lastResetDay;
    bool public emergencyStop;
    
    struct Trade {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 timestamp;
        bool executed;
        uint256 amountOut; // Filled after execution
        uint256 gasUsed;
    }
    
    // Events
    event TradeProposed(
        bytes32 indexed tradeId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 timestamp
    );
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        uint256 amountOut,
        uint256 gasUsed,
        uint256 timestamp
    );
    
    event TradeCancelled(
        bytes32 indexed tradeId,
        string reason,
        uint256 timestamp
    );
    
    event EmergencyStopToggled(bool stopped);
    event MaxDailyLossUpdated(uint256 newLimit);
    event LossRecorded(uint256 loss, uint256 totalDailyLoss);
    
    // Modifiers
    modifier onlyAgent() {
        require(msg.sender == whalEAgent, "TradingWallet: Only Whal-E agent");
        _;
    }
    
    modifier whenNotEmergency() {
        require(!emergencyStop, "TradingWallet: Emergency stop active");
        _;
    }
    
    modifier checkDailyReset() {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            dailyLoss = 0;
            lastResetDay = currentDay;
        }
        _;
    }
    
    constructor(
        address _swapRouter,
        address _agent,
        address _owner
    ) {
        require(_swapRouter != address(0), "TradingWallet: Invalid router");
        require(_agent != address(0), "TradingWallet: Invalid agent");
        require(_owner != address(0), "TradingWallet: Invalid owner");
        
        swapRouter = ISwapRouter(_swapRouter);
        whalEAgent = _agent;
        _transferOwnership(_owner);
        
        maxDailyLoss = 500; // Default 5%
        lastResetDay = block.timestamp / 1 days;
    }
    
    /**
     * @notice Propose a new trade for the owner to execute
     * @param tokenIn Token to swap from
     * @param tokenOut Token to swap to
     * @param amountIn Amount of tokenIn
     * @param minAmountOut Minimum amount of tokenOut (slippage protection)
     * @return tradeId Unique identifier for this trade
     */
    function proposeTrade(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external onlyAgent whenNotEmergency returns (bytes32 tradeId) {
        require(tokenIn != address(0) && tokenOut != address(0), "TradingWallet: Invalid tokens");
        require(tokenIn != tokenOut, "TradingWallet: Same token");
        require(amountIn > 0, "TradingWallet: Zero amount");
        
        tradeId = keccak256(abi.encodePacked(
            tradeCounter++,
            tokenIn,
            tokenOut,
            amountIn,
            block.timestamp
        ));
        
        pendingTrades[tradeId] = Trade({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            timestamp: block.timestamp,
            executed: false,
            amountOut: 0,
            gasUsed: 0
        });
        
        emit TradeProposed(tradeId, tokenIn, tokenOut, amountIn, minAmountOut, block.timestamp);
        
        return tradeId;
    }
    
    /**
     * @notice Execute a pending trade
     * @param tradeId Trade to execute
     * @param poolFee Fee tier of the pool (e.g., 3000 for 0.3%)
     */
    function executeTrade(
        bytes32 tradeId,
        uint24 poolFee
    ) external onlyAgent whenNotEmergency nonReentrant checkDailyReset {
        Trade storage trade = pendingTrades[tradeId];
        
        require(trade.timestamp > 0, "TradingWallet: Trade not found");
        require(!trade.executed, "TradingWallet: Already executed");
        require(block.timestamp <= trade.timestamp + 1 hours, "TradingWallet: Expired");
        
        // Get balance before for loss calculation
        uint256 balanceBefore = IERC20(trade.tokenOut).balanceOf(address(this));
        
        // Approve router
        IERC20(trade.tokenIn).approve(address(swapRouter), trade.amountIn);
        
        uint256 gasStart = gasleft();
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: trade.tokenIn,
            tokenOut: trade.tokenOut,
            fee: poolFee,
            recipient: owner(),
            deadline: block.timestamp + 15 minutes,
            amountIn: trade.amountIn,
            amountOutMinimum: trade.minAmountOut,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = swapRouter.exactInputSingle(params);
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Record execution
        trade.executed = true;
        trade.amountOut = amountOut;
        trade.gasUsed = gasUsed;
        
        // Move to executed mapping
        executedTrades[tradeId] = trade;
        delete pendingTrades[tradeId];
        
        // Calculate and record loss if applicable
        if (amountOut < trade.minAmountOut) {
            uint256 loss = ((trade.minAmountOut - amountOut) * 10000) / trade.minAmountOut;
            dailyLoss += loss;
            emit LossRecorded(loss, dailyLoss);
            
            // Check if daily loss limit exceeded
            if (dailyLoss > maxDailyLoss) {
                emergencyStop = true;
                emit EmergencyStopToggled(true);
            }
        }
        
        emit TradeExecuted(tradeId, amountOut, gasUsed, block.timestamp);
    }
    
    /**
     * @notice Cancel a pending trade
     * @param tradeId Trade to cancel
     * @param reason Reason for cancellation
     */
    function cancelTrade(bytes32 tradeId, string calldata reason) external onlyAgent {
        Trade storage trade = pendingTrades[tradeId];
        require(trade.timestamp > 0, "TradingWallet: Trade not found");
        require(!trade.executed, "TradingWallet: Already executed");
        
        delete pendingTrades[tradeId];
        emit TradeCancelled(tradeId, reason, block.timestamp);
    }
    
    /**
     * @notice Set maximum daily loss limit
     * @param _maxDailyLoss New limit in basis points (100 = 1%)
     */
    function setMaxDailyLoss(uint256 _maxDailyLoss) external onlyOwner {
        require(_maxDailyLoss <= 10000, "TradingWallet: Max 100%");
        maxDailyLoss = _maxDailyLoss;
        emit MaxDailyLossUpdated(_maxDailyLoss);
    }
    
    /**
     * @notice Toggle emergency stop
     */
    function toggleEmergencyStop() external onlyOwner {
        emergencyStop = !emergencyStop;
        emit EmergencyStopToggled(emergencyStop);
    }
    
    /**
     * @notice Get pending trade details
     */
    function getPendingTrade(bytes32 tradeId) external view returns (Trade memory) {
        return pendingTrades[tradeId];
    }
    
    /**
     * @notice Get executed trade details
     */
    function getExecutedTrade(bytes32 tradeId) external view returns (Trade memory) {
        return executedTrades[tradeId];
    }
    
    /**
     * @notice Check if can trade (not stopped, within limits)
     */
    function canTrade() external view returns (bool) {
        if (emergencyStop) return false;
        
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentLoss = (currentDay > lastResetDay) ? 0 : dailyLoss;
        
        return currentLoss < maxDailyLoss;
    }
    
    /**
     * @notice Emergency withdraw tokens
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Receive BNB
     */
    receive() external payable {}
    
    /**
     * @notice Withdraw BNB
     */
    function withdrawBNB() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
