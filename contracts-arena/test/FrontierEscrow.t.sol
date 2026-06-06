// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FrontierEscrow, IERC20} from "../src/FrontierEscrow.sol";

contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract FrontierEscrowTest is Test {
    MockUSDC usdc;
    FrontierEscrow escrow;

    address owner = address(0xA11CE);
    address treasury = address(0x7EEA);
    address creator = address(0xC0FFEE);
    address king = address(0x6116);

    uint256 constant CID = 1;
    uint256 constant BOUNTY = 1_000e6; // 1000 USDC

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new FrontierEscrow(IERC20(address(usdc)), owner, treasury);

        usdc.mint(creator, BOUNTY);
        vm.prank(creator);
        usdc.approve(address(escrow), BOUNTY);
    }

    function _create() internal {
        vm.prank(creator);
        escrow.createChallenge(CID, BOUNTY);
    }

    function test_CreateChallenge() public {
        _create();
        (address c, address k, uint256 pool, bool active) = escrow.challenges(CID);
        assertEq(c, creator);
        assertEq(k, address(0));
        assertEq(pool, BOUNTY);
        assertTrue(active);
        assertEq(escrow.totalPooled(), BOUNTY);
        assertEq(usdc.balanceOf(address(escrow)), BOUNTY);
    }

    function test_SetKing() public {
        _create();
        vm.prank(owner);
        escrow.setKing(CID, king);
        (, address k,,) = escrow.challenges(CID);
        assertEq(k, king);
    }

    function test_SetKing_OnlyOwner() public {
        _create();
        vm.expectRevert("not owner");
        escrow.setKing(CID, king);
    }

    function test_SettleFees_SplitMath() public {
        _create();
        vm.prank(owner);
        escrow.setKing(CID, king);

        // Simulate x402 fees arriving as a plain transfer.
        uint256 fee = 100e6; // 100 USDC
        usdc.mint(address(escrow), fee);

        vm.prank(owner);
        escrow.settleFees(CID, fee);

        // 70 king, 20 pool, 10 treasury
        assertEq(usdc.balanceOf(king), 70e6);
        assertEq(usdc.balanceOf(treasury), 10e6);
        (,, uint256 pool,) = escrow.challenges(CID);
        assertEq(pool, BOUNTY + 20e6);
        assertEq(escrow.totalPooled(), BOUNTY + 20e6);
    }

    function test_SettleFees_NoKing_AllToPool() public {
        _create();
        uint256 fee = 100e6;
        usdc.mint(address(escrow), fee);

        vm.prank(owner);
        escrow.settleFees(CID, fee);

        // 90% (king share + pool share) to pool, 10% treasury
        (,, uint256 pool,) = escrow.challenges(CID);
        assertEq(pool, BOUNTY + 90e6);
        assertEq(usdc.balanceOf(treasury), 10e6);
    }

    function test_SettleFees_InsufficientFees() public {
        _create();
        // No fees arrived; contract balance == totalPooled.
        vm.prank(owner);
        vm.expectRevert("insufficient fees");
        escrow.settleFees(CID, 1e6);
    }

    function test_CloseChallenge() public {
        _create();
        vm.prank(owner);
        escrow.setKing(CID, king);

        uint256 fee = 100e6;
        usdc.mint(address(escrow), fee);
        vm.prank(owner);
        escrow.settleFees(CID, fee); // pool now BOUNTY + 20e6

        uint256 expectedPayout = BOUNTY + 20e6;
        vm.prank(owner);
        escrow.closeChallenge(CID);

        assertEq(usdc.balanceOf(king), 70e6 + expectedPayout);
        (,, uint256 pool, bool active) = escrow.challenges(CID);
        assertEq(pool, 0);
        assertFalse(active);
        assertEq(escrow.totalPooled(), 0);
    }
}
