'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import './globals.css';

const HermesChat = dynamic(() => import('@/app/components/HermesChat'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>VURA | Prediction Terminal</title>
        <meta name="description" content="VURA — Advanced prediction market analytics. Real-time Alpha signals and Arbitrage detection." />
      </head>
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk'}
          config={{
            appearance: { theme: 'dark', accentColor: '#059669' },
            loginMethods: ['email', 'wallet', 'google', 'twitter'],
            embeddedWallets: {
              ethereum: { createOnLogin: 'off' as const }
            }
          }}
        >
          {children}
          <HermesChat />
        </PrivyProvider>
      </body>
    </html>
  );
}
