import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <title>VURA Weather | Polymarket Temperature Trading</title>
        <meta name="description" content="VURA — weather prediction market terminal. Find price dislocations between Polymarket temperature markets and real forecasts." />
      </head>
      <body className="dark">
        {children}
      </body>
    </html>
  );
}
