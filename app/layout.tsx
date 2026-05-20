'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk'}
          config={{
            appearance: { theme: 'dark', accentColor: '#059669' },
            loginMethods: ['email', 'wallet', 'google'],
            embeddedWallets: {
              ethereum: { createOnLogin: 'users-without-wallets' as const }
            }
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
