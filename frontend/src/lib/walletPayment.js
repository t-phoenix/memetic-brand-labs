import { createPublicClient, custom, formatUnits, http } from 'viem';
import { base } from 'viem/chains';

export const BASE_CHAIN_ID = 8453;
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function getUsdcAddress() {
  return USDC_ADDRESS;
}

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const BASE_CHAIN_PARAMS = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

export function getChainConfig() {
  return base;
}

export function getChainName() {
  return BASE_CHAIN_PARAMS.chainName;
}

export async function getWalletChainId(provider) {
  const hex = await provider.request({ method: 'eth_chainId' });
  return Number.parseInt(hex, 16);
}

export async function ensureBaseNetwork(provider) {
  const chainId = await getWalletChainId(provider);
  if (chainId === BASE_CHAIN_ID) {
    return { switched: false, chainId, chainName: BASE_CHAIN_PARAMS.chainName };
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_PARAMS.chainId }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [BASE_CHAIN_PARAMS],
      });
    } else {
      throw new Error(`Please switch your wallet to ${BASE_CHAIN_PARAMS.chainName} to continue.`);
    }
  }

  return { switched: true, chainId: BASE_CHAIN_ID, chainName: BASE_CHAIN_PARAMS.chainName };
}

export async function getUsdcBalance(walletAddress, provider) {
  const client = provider
    ? createPublicClient({
        chain: getChainConfig(),
        transport: custom(provider),
      })
    : createPublicClient({
        chain: getChainConfig(),
        transport: http(),
      });

  try {
    const balance = await client.readContract({
      address: getUsdcAddress(),
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    return {
      raw: balance,
      formatted: formatUnits(balance, 6),
      numeric: Number(formatUnits(balance, 6)),
    };
  } catch (err) {
    const chain = getChainName();
    throw new Error(
      `Could not read USDC balance on ${chain}. Switch your wallet to ${chain} and try again.`,
      { cause: err },
    );
  }
}

export function hasSufficientBalance(balanceNumeric, priceUsdc) {
  return balanceNumeric >= priceUsdc - 0.000001;
}

export function formatUsdc(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return n < 0.01 ? n.toFixed(4) : n.toFixed(2);
}

export function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function buildPaymentSummary({ quote, walletAddress }) {
  return {
    amount: formatUsdc(quote.price_usdc),
    asset: quote.asset || 'USDC',
    chain: quote.chain_name || getChainName(),
    recipient: quote.pay_to ? truncateAddress(quote.pay_to) : 'Memetic Brand Labs',
    payer: truncateAddress(walletAddress),
    description: quote.description || 'Narrative Engine analysis',
    dapp: 'Memetic Brand Labs — Narrative Engine',
  };
}
