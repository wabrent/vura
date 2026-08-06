'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>VURA Weather | Trade Polymarket Temperature Markets</title>
        <meta name="description" content="Find price dislocations between Polymarket weather markets and real forecasts. Buy when the market is slow." />
      </head>
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk'}
          config={{
            appearance: { theme: 'dark', accentColor: '#2affce' },
            loginMethods: ['email', 'wallet', 'google', 'twitter'],
            embeddedWallets: { ethereum: { createOnLogin: 'off' as const } }
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
