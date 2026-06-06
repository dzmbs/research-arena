// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FrontierEscrow, IERC20} from "../src/FrontierEscrow.sol";

contract Deploy is Script {
    // Base Sepolia USDC
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external returns (FrontierEscrow escrow) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        // owner = deployer (trusted server), treasury = deployer
        escrow = new FrontierEscrow(IERC20(USDC), deployer, deployer);
        vm.stopBroadcast();

        console.log("FrontierEscrow deployed at:", address(escrow));
        console.log("usdc:", USDC);
        console.log("owner/treasury:", deployer);
    }
}
