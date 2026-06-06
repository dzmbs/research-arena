# Frontier Arena — Prize Escrow

Minimal USDC prize-escrow for a king-of-the-hill challenge arena (Coinbase x402 hackathon).

Players pay submission fees via **x402** with `payTo` set to this contract, so USDC arrives
as plain ERC20 transfers (no hooks). A trusted server (the contract `owner`) reports the
current leaderboard king and settles fees.

**Fee split on `settleFees`:** 70% king · 20% challenge pool · 10% treasury.
(If there is no king yet, the king's 70% rolls into the pool.)

## Contract: `src/FrontierEscrow.sol`

- `createChallenge(uint256 id, uint256 bounty)` — anyone; pulls `bounty` USDC into the pool.
- `setKing(uint256 id, address king)` — onlyOwner.
- `settleFees(uint256 id, uint256 feeAmount)` — onlyOwner; splits newly-arrived fees.
- `closeChallenge(uint256 id)` — onlyOwner; pays the whole pool to the king, marks inactive.

USDC accounting uses a `totalPooled` accumulator so `settleFees` can cheaply verify that
`balanceOf(this) - totalPooled >= feeAmount` (i.e. only unattributed fees get settled).

## Build & test

```bash
forge build
forge test -vv
```

## Deploy (Base Sepolia)

USDC is hardcoded to Base Sepolia `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
`owner` and `treasury` are both set to the deployer.

```bash
export DEPLOYER_PRIVATE_KEY=0x...   # funded Base Sepolia key

forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

The deployed address is printed in the logs and saved under `broadcast/Deploy.s.sol/84532/`.

### Verify it deployed (read immutables)

```bash
export ESCROW=0xYourDeployedAddress
export RPC=https://sepolia.base.org

cast call $ESCROW "usdc()(address)"     --rpc-url $RPC
cast call $ESCROW "owner()(address)"    --rpc-url $RPC
cast call $ESCROW "treasury()(address)" --rpc-url $RPC
```

## Interact with cast

```bash
export USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export ESCROW=0xYourDeployedAddress
export RPC=https://sepolia.base.org
# DEPLOYER_PRIVATE_KEY already exported above

# 1. Approve the escrow to pull 10 USDC (USDC has 6 decimals -> 10e6)
cast send $USDC "approve(address,uint256)" $ESCROW 10000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# 2. Create challenge id=1 with a 10 USDC bounty
cast send $ESCROW "createChallenge(uint256,uint256)" 1 10000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# 3. Check the challenge pool (returns creator, king, pool, active)
cast call $ESCROW "challenges(uint256)(address,address,uint256,bool)" 1 --rpc-url $RPC

# Owner-only ops:
# Set the current king
cast send $ESCROW "setKing(uint256,address)" 1 0xKingAddress \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# Settle 5 USDC of arrived fees (must already be sitting in the contract)
cast send $ESCROW "settleFees(uint256,uint256)" 1 5000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# Close the challenge and pay the pool to the king
cast send $ESCROW "closeChallenge(uint256)" 1 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY
```
