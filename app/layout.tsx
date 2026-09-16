import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "./lib/calculators";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "ShouldIFinance — Free Financial Calculators & Guidance",
    template: "%s | ShouldIFinance",
  },
  description:
    "Free calculators for mortgages, refinancing, investing, retirement, auto loans, and debt payoff. Better questions, smarter decisions — no sign-up required.",
  keywords: [
    "financial calculator",
    "mortgage calculator",
    "refinance calculator",
    "retirement calculator",
    "investment calculator",
    "debt payoff calculator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ShouldIFinance",
    url: SITE,
    title: "ShouldIFinance — Free Financial Calculators & Guidance",
    description:
      "Free calculators for mortgages, refinancing, investing, retirement, auto loans, and debt payoff. Better questions, smarter decisions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShouldIFinance — Free Financial Calculators & Guidance",
    description:
      "Free calculators for mortgages, refinancing, investing, retirement, auto loans, and debt payoff.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
