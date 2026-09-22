import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "דוח ניהול לקוחות · VAX AQUA",
  description: "CRM שטח לאביזרי הולכת מים",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "VAX AQUA", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
