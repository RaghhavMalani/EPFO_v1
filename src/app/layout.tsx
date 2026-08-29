import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { epfoService } from "@/application/service-instance";
import { AppFooter, AppHeader } from "@/components/app-shell";
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
  // The shell shows the member the synthetic state actually describes, never a second copy of it.
  const { member } = epfoService.getSnapshot();
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        <AppHeader member={{ name: member.name, uanMasked: member.uanMasked }} />
        <main id="main-content">{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
