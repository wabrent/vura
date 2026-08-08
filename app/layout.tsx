'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { polygon } from 'wagmi/chains';
import './globals.css';

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'VURA',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [polygon],
  ssr: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>VURA Markets | Prediction Terminal</title>
        <meta name="description" content="VURA — prediction market terminal for Polymarket. Trade weather, crypto, sports and more." />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
