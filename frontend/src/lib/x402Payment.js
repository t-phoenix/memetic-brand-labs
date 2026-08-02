import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';
import { createWalletClient, custom } from 'viem';
import { toAccount } from 'viem/accounts';
import { API_URL, parseJsonResponse, getSessionId } from './narrativeApi';
import { ensureBaseNetwork, getChainConfig } from './walletPayment';

/**
 * @x402/fetch incorrectly sets Access-Control-Expose-Headers on outgoing requests.
 * That header is response-only; browsers reject it on cross-origin preflight.
 */
function corsSafeFetch(baseFetch = fetch) {
  return async (input, init) => {
    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      headers.delete('Access-Control-Expose-Headers');
      headers.delete('access-control-expose-headers');
      return baseFetch(new Request(input, { headers }), init);
    }
    const headers = new Headers(init?.headers);
    headers.delete('Access-Control-Expose-Headers');
    headers.delete('access-control-expose-headers');
    return baseFetch(input, { ...init, headers });
  };
}

async function accountFromPrivyWallet(wallet) {
  const provider = await wallet.getEthereumProvider();
  await ensureBaseNetwork(provider);

  const address = wallet.address;
  const walletClient = createWalletClient({
    account: address,
    chain: getChainConfig(),
    transport: custom(provider),
  });

  return toAccount({
    address,
    async signTypedData(parameters) {
      return walletClient.signTypedData({
        account: address,
        ...parameters,
      });
    },
  });
}

function createInstrumentedFetch(onProgress, baseFetch = fetch) {
  const safeFetch = corsSafeFetch(baseFetch);
  let attempt = 0;
  return async (input, init) => {
    attempt += 1;
    if (attempt > 1) {
      onProgress?.('settling');
    }
    const response = await safeFetch(input, init);
    if (attempt === 1 && response.status === 402) {
      onProgress?.('wallet');
    }
    return response;
  };
}

export async function createPaymentFetchFromWallet(wallet, onProgress) {
  const account = await accountFromPrivyWallet(wallet);
  const chain = getChainConfig();
  const baseFetch = corsSafeFetch(fetch);
  const instrumentedFetch = onProgress ? createInstrumentedFetch(onProgress, baseFetch) : baseFetch;
  return wrapFetchWithPaymentFromConfig(instrumentedFetch, {
    schemes: [
      { network: `eip155:${chain.id}`, client: new ExactEvmScheme(account) },
      { network: 'eip155:*', client: new ExactEvmScheme(account) },
    ],
  });
}

export async function startRunWithX402(intake, wallet, { onProgress } = {}) {
  onProgress?.('wallet');
  const fetchWithPayment = await createPaymentFetchFromWallet(wallet, onProgress);
  const idempotencyKey = crypto.randomUUID();
  const res = await fetchWithPayment(`${API_URL}/v1/narrative-runs/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': getSessionId(),
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({ ...intake, auth_method: 'x402' }),
  });
  onProgress?.('verifying');
  const data = await parseJsonResponse(res);
  onProgress?.('confirmed');
  onProgress?.('starting');
  return data;
}

export async function unlockRunWithX402(runId, wallet, { onProgress, modelTier } = {}) {
  onProgress?.('wallet');
  const fetchWithPayment = await createPaymentFetchFromWallet(wallet, onProgress);
  const idempotencyKey = crypto.randomUUID();
  const res = await fetchWithPayment(`${API_URL}/v1/runs/${runId}/unlock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(modelTier ? { model_tier: modelTier } : {}),
  });
  onProgress?.('verifying');
  const data = await parseJsonResponse(res);
  onProgress?.('confirmed');
  onProgress?.('starting');
  return data;
}
