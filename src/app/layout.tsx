import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { getInitialUser } from "@/lib/auth";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Early Bird",
  description: "Pre-market marketplace for LA flea markets",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getInitialUser();
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </body>
    </html>
  );
}
