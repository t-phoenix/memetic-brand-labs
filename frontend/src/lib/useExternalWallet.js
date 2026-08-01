import { useCallback, useRef } from 'react';
import { useConnectWallet } from '@privy-io/react-auth';

/** Explicit wallets only — omit detected_* entries so Privy does not auto-pick the first extension. */
export const EVM_WALLET_LIST = ['metamask', 'phantom', 'coinbase_wallet', 'rainbow', 'wallet_connect'];

export function useExternalWallet() {
  const pending = useRef(null);

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      pending.current?.resolve(wallet);
      pending.current = null;
    },
    onError: (error) => {
      pending.current?.reject(error instanceof Error ? error : new Error(String(error)));
      pending.current = null;
    },
  });

  const connectSpecificWallet = useCallback(
    (walletId) => {
      if (!walletId) {
        return Promise.reject(new Error('Choose a wallet to continue.'));
      }

      return new Promise((resolve, reject) => {
        pending.current = { resolve, reject };
        connectWallet({
          description: 'Connect the wallet you selected.',
          walletChainType: 'ethereum',
          walletList: [walletId],
        });
      });
    },
    [connectWallet],
  );

  return { connectSpecificWallet };
}
