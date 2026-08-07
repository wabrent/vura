'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>VURA Markets | Prediction Terminal</title>
        <meta name="description" content="VURA — prediction market terminal for Polymarket. Trade weather, crypto, sports and more." />
      </head>
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk'}
          config={{
            appearance: { theme: 'dark', accentColor: '#ffffff' },
            loginMethods: ['wallet', 'email', 'google'],
            embeddedWallets: { ethereum: { createOnLogin: 'off' } }
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
