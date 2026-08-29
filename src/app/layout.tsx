import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { LanguageProvider } from "@/lib/i18n/language-context";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "EPFO One | Independent prototype",
    template: "%s | EPFO One",
  },
  description: "A synthetic, goal-first PF citizen journey for a hackathon prototype.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
