// Frontier Arena — x402 paywall for the real challenge's submit endpoint.
// If NEXT_PUBLIC_PAYTO_ADDRESS is unset, this no-ops so the app boots
// without payment configured.
import { NextResponse, type NextRequest } from 'next/server';
import { paymentMiddleware, type RoutesConfig } from 'x402-next';
import type { Address } from 'viem';

const payTo = process.env.NEXT_PUBLIC_PAYTO_ADDRESS?.trim();
const facilitatorUrl =
  process.env.X402_FACILITATOR_URL?.trim() || 'https://x402.org/facilitator';

const ROUTES: RoutesConfig = {
  'POST /api/challenges/prediction-market/submit': {
    price: '$0.10',
    network: 'base-sepolia',
    config: {
      description: 'Submit a strategy to the Prediction Market challenge',
    },
  },
};

const x402 = payTo
  ? paymentMiddleware(payTo as Address, ROUTES, {
      url: facilitatorUrl as `${string}://${string}`,
    })
  : null;

export async function proxy(request: NextRequest) {
  if (!x402) return NextResponse.next();
  return x402(request);
}

export const config = {
  matcher: ['/api/challenges/prediction-market/submit'],
};
