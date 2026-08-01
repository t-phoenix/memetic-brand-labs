import { PrivyProvider } from '@privy-io/react-auth';
import { getChainConfig } from '../lib/walletPayment';
import { EVM_WALLET_LIST } from '../lib/useExternalWallet';

const appId = import.meta.env.VITE_PRIVY_APP_ID;
const defaultChain = getChainConfig();

export function NarrativePrivyProvider({ children }) {
  if (!appId) {
    return children;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#111111',
          walletChainType: 'ethereum-only',
          walletList: EVM_WALLET_LIST,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain,
        supportedChains: [defaultChain],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
