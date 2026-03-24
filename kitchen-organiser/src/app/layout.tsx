import type { Metadata } from "next";
import "./globals.css";

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
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
