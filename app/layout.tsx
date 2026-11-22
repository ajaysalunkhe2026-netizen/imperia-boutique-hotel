import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://imperiaboutiquehotel.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Imperia Boutique Hotel | Hotel in Rabale, Navi Mumbai",
    template: "%s | Imperia Boutique Hotel",
  },
  description:
    "Discover Imperia Boutique Hotel in Rabale, Navi Mumbai. Explore room options, find the hotel location and enquire directly about your stay.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Imperia Boutique Hotel",
    title: "Imperia Boutique Hotel | Rabale, Navi Mumbai",
    description: "A welcoming hotel address in Rabale, Navi Mumbai.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#17231f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
