// Best-effort on-chain king update on Base Sepolia. Never throws.
import {
  createWalletClient,
  http,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const ESCROW_ABI = [
  {
    type: 'function',
    name: 'setKing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'king', type: 'address' },
    ],
    outputs: [],
  },
] as const;

/**
 * Calls escrow.setKing(challengeId, king). Returns the tx hash on success,
 * or null if not configured / failed. Logs failures, never throws.
 */
export async function setKingOnChain(
  challengeId: number,
  king: string,
): Promise<string | null> {
  const escrow = process.env.ESCROW_ADDRESS;
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  const rpc = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
  if (!escrow || !pk) return null;
  try {
    const account = privateKeyToAccount(
      (pk.startsWith('0x') ? pk : `0x${pk}`) as Hex,
    );
    const client = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpc),
    });
    const hash = await client.writeContract({
      address: escrow as Address,
      abi: ESCROW_ABI,
      functionName: 'setKing',
      args: [BigInt(challengeId), king as Address],
    });
    return hash;
  } catch (err) {
    console.error('[chain] setKing failed:', (err as Error)?.message ?? err);
    return null;
  }
}
