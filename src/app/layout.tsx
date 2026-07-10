import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlwaysHere — AI receptionist for missed calls",
  description:
    "An AI receptionist that answers your missed business calls, speaks your customers' language, answers questions, captures leads, and books appointments.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
