import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nritransfer.com"),
  title: "NRI Transfer — Compare Money Transfer Rates to India",
  description: "Compare live exchange rates to India across Wise, Remitly, XE, OFX and Instarem. Built for NRIs sending money home from Australia, the UAE, USA, UK, Canada, and Singapore.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
