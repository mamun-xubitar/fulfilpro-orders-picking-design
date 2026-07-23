import type { Metadata } from "next";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import AuthProvider from "@/components/AuthProvider";

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
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
          <ToastContainer position="bottom-right" theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}
