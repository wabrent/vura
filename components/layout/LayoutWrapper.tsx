"use client";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

// Pages in this app are standalone (terminal / vurafy) and bring their own
// chrome — the old marketplace header/footer was removed with the marketplace.
export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return <>{children}</>;
}
