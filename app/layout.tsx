import type { Metadata } from "next";
import "./globals.css";
import "./design-tokens.css";
import "./marketing.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "TrustGraph",
  description: "Verified professional identity and workforce record platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
