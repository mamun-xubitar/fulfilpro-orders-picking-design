import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FulfilPro",
  description: "Fulfilment Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
