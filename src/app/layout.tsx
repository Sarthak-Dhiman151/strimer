import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Strimer",
  description: "Verified student reviews and communities for Indian colleges",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<div className="h-14 border-b" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
