import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "PrivacyLayer — Privacy Compliance for AI",
  description: "Detect, tokenize, and vault personal information before it reaches any AI model. Client-side. Zero leakage.",
  keywords: ["privacy", "ai", "tokenization", "data-protection", "compliance"],
  authors: [{ name: "PrivacyLayer" }],
  openGraph: {
    title: "PrivacyLayer — Privacy Compliance for AI",
    description: "Detect, tokenize, and vault personal information before it reaches any AI model.",
    type: "website",
    url: "https://privacylayer.com",
    siteName: "PrivacyLayer",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrivacyLayer — Privacy Compliance for AI",
    description: "Detect, tokenize, and vault personal information before it reaches any AI model.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
