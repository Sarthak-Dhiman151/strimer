import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strimer",
  description: "Verified student reviews and communities for Indian colleges",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
