import type { Metadata } from "next";
import "./globals.css";
import { OriginTracker } from "@/components/OriginTracker";

export const metadata: Metadata = {
  title: "FastBeauty Pro - Barber & Salon",
  description: "Digitalize a operação da sua barbearia ou salão.",
  manifest: "/manifest.json?v=2",
  icons: {
    icon: "/icon.png?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f2b90d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build Timestamp: 2026-02-06T13:06:00 (Forcing Cache Revalidation)
  return (
    <html lang="pt-br">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `body { font-family: 'Manrope', sans-serif; }` }} />
      </head>
      <body>
        <OriginTracker />
        {children}
      </body>
    </html>
  );
}
