import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"] });

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
      <body className={manrope.className}>
        {children}
      </body>
    </html>
  );
}
