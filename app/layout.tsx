import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://imperiaboutiquehotel.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Imperia Boutique Hotel Rabale | Navi Mumbai",
    template: "%s | Imperia Boutique Hotel",
  },
  description:
    "Official website of Imperia Boutique Hotel in Rabale, Navi Mumbai. View hotel information, explore the location and enquire about your stay.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Imperia Boutique Hotel",
    title: "Imperia Boutique Hotel Rabale | Navi Mumbai",
    description:
      "Official website of Imperia Boutique Hotel in Rabale, Navi Mumbai.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#17231f",
  width: "device-width",
  initialScale: 1,
};

const hotelStructuredData = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "Imperia Boutique Hotel",
  url: siteUrl,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Rabale",
    addressRegion: "Maharashtra",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelStructuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
