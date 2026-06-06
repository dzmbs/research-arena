// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title FrontierEscrow
/// @notice Minimal prize-escrow for the Frontier Arena king-of-the-hill platform.
/// USDC submission fees arrive via plain ERC20 transfers (x402 payTo == this contract).
/// A trusted owner (server) reports the leaderboard king and settles fee splits.
contract FrontierEscrow {
    IERC20 public immutable usdc;
    address public owner;
    address public treasury;

    struct Challenge {
        address creator;
        address king;
        uint256 pool;
        bool active;
    }

    mapping(uint256 => Challenge) public challenges;

    /// @notice Sum of all challenge pools. Lets us cheaply tell apart pooled
    /// funds from unattributed submission fees sitting in the contract balance.
    uint256 public totalPooled;

    event ChallengeCreated(uint256 indexed id, address indexed creator, uint256 bounty);
    event NewKing(uint256 indexed id, address king);
    event FeesSettled(
        uint256 indexed id, address king, uint256 kingAmount, uint256 poolAmount, uint256 treasuryAmount
    );
    event ChallengeClosed(uint256 indexed id, address king, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(IERC20 _usdc, address _owner, address _treasury) {
        require(_owner != address(0) && _treasury != address(0), "zero addr");
        usdc = _usdc;
        owner = _owner;
        treasury = _treasury;
    }

    /// @notice Anyone can fund a new challenge. Pulls `bounty` USDC into its pool.
    function createChallenge(uint256 id, uint256 bounty) external {
        require(challenges[id].creator == address(0), "exists");
        challenges[id] =
            Challenge({creator: msg.sender, king: address(0), pool: bounty, active: true});
        totalPooled += bounty;
        require(usdc.transferFrom(msg.sender, address(this), bounty), "transferFrom failed");
        emit ChallengeCreated(id, msg.sender, bounty);
    }

    /// @notice Owner reports the current leaderboard king.
    function setKing(uint256 id, address king) external onlyOwner {
        require(challenges[id].active, "inactive");
        challenges[id].king = king;
        emit NewKing(id, king);
    }

    /// @notice Owner settles newly-arrived submission fees attributed to a challenge.
    /// Split: 70% king, 20% pool, 10% treasury. If no king, the 70% rolls into the pool.
    function settleFees(uint256 id, uint256 feeAmount) external onlyOwner {
        Challenge storage c = challenges[id];
        require(c.active, "inactive");
        require(feeAmount > 0, "zero fee");
        // Only unattributed fee balance may be settled.
        require(usdc.balanceOf(address(this)) - totalPooled >= feeAmount, "insufficient fees");

        uint256 kingAmount = (feeAmount * 70) / 100;
        uint256 treasuryAmount = (feeAmount * 10) / 100;
        // Remainder to pool to avoid rounding dust loss.
        uint256 poolAmount = feeAmount - kingAmount - treasuryAmount;

        address king = c.king;
        if (king == address(0)) {
            poolAmount += kingAmount;
            kingAmount = 0;
        }

        // effects
        c.pool += poolAmount;
        totalPooled += poolAmount;

        // interactions
        if (kingAmount > 0) {
            require(usdc.transfer(king, kingAmount), "king xfer failed");
        }
        require(usdc.transfer(treasury, treasuryAmount), "treasury xfer failed");

        emit FeesSettled(id, king, kingAmount, poolAmount, treasuryAmount);
    }

    /// @notice Owner closes a challenge, paying the entire remaining pool to the king.
    function closeChallenge(uint256 id) external onlyOwner {
        Challenge storage c = challenges[id];
        require(c.active, "inactive");

        uint256 payout = c.pool;
        address king = c.king;

        // effects
        c.pool = 0;
        c.active = false;
        totalPooled -= payout;

        // interactions
        if (payout > 0 && king != address(0)) {
            require(usdc.transfer(king, payout), "payout failed");
        }

        emit ChallengeClosed(id, king, payout);
    }
}
