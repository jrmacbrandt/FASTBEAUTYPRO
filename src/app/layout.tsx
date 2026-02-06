import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FastBeauty Pro - Barber & Salon",
  description: "Digitalize a operação da sua barbearia ou salão.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `body { font-family: 'Manrope', sans-serif; }` }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
