import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NammaCal — Private Nutrition & Activity Tracker",
  description:
    "Private, invite-only nutrition, calorie, macro, weight, and activity tracking for Indian & Tamil foods.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
