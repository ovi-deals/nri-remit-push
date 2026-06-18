import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NRI Remit — Best AUD → INR Rates",
  description: "Compare live AUD to INR rates across Wise, Remitly, XE, OFX and Instarem. AI-powered timing suggestions for NRIs in Australia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
