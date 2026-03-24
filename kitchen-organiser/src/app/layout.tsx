import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";

export const metadata: Metadata = {
  title: "The Kitchen Organiser",
  description: "Your household kitchen management app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-warm-50 text-warm-800 font-sans antialiased">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 min-h-screen">
          {children}
        </main>
        <MobileTabBar />
      </body>
    </html>
  );
}
