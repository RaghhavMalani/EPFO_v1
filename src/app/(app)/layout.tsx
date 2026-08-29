import { epfoService } from "@/application/service-instance";
import { AppFooter, AppHeader } from "@/components/app-shell";

export default function AppShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The shell shows the member the synthetic state actually describes, never a second copy of it.
  const { member } = epfoService.getSnapshot();
  return (
    <>
      <AppHeader member={{ name: member.name, uanMasked: member.uanMasked }} />
      <main id="main-content">{children}</main>
      <AppFooter />
    </>
  );
}
