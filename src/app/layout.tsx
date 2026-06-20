import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nritransfer.com"),
  title: "NRI Transfer — Compare Money Transfer Rates to India",
  description: "Compare live exchange rates to India across Wise, Remitly, XE, OFX and Instarem. Built for NRIs sending money home from Australia, the UAE, USA, UK, Canada, and Singapore.",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NRI Transfer",
  url: "https://nritransfer.com",
  description: "Live exchange rate comparison for NRIs sending money to India.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NRI Transfer",
  url: "https://nritransfer.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        {children}
      </body>
    </html>
  );
}
