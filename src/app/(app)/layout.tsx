import { cookies } from "next/headers";
import { loadSession } from "@/application/session";
import { AppFooter, AppHeader } from "@/components/app-shell";
import { JudgeTourRail } from "@/components/judge-tour";
import { deriveTourProgress } from "@/domain/judge-tour";
import { buildSystemTrace } from "@/domain/system-trace";
import { TOUR_COOKIE, parseAcknowledgedIndex } from "@/lib/tour";

export default async function AppShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { epfoService, experienceV2Service } = await loadSession();
  // The shell shows the member the synthetic state actually describes, never a second copy of it.
  const snapshot = epfoService.getSnapshot();
  const { member, employer } = snapshot;

  const cookieStore = await cookies();
  const acknowledgedIndex = parseAcknowledgedIndex(cookieStore.get(TOUR_COOKIE)?.value);

  // The walkthrough reads its position out of the scenario; it never stores a second
  // copy of where things stand, so it cannot disagree with the screen behind it.
  const tour = acknowledgedIndex === null
    ? null
    : deriveTourProgress(
        {
          readinessPassedCount: snapshot.readiness.passedCount,
          readinessTotalChecks: snapshot.readiness.totalChecks,
          claimState: snapshot.claim.state,
          ecrPaid: experienceV2Service.getExperience().ecrs.some((ecr) => ecr.state === "PAID"),
          marchEmployerContributionPaise:
            snapshot.experience.contributions.find((item) => item.month === "2026-03")
              ?.employerEpfContributionPaise ?? 0,
          pfBalancePaise: member.currentPfBalancePaise,
        },
        acknowledgedIndex,
      );

  return (
    <div className={tour ? "tour-shell" : undefined}>
      <AppHeader
        member={{ name: member.name, uanMasked: member.uanMasked }}
        employer={{ name: employer.name, establishmentIdMasked: employer.establishmentIdMasked }}
      />
      <main id="main-content">{children}</main>
      {tour ? <JudgeTourRail progress={tour} trace={buildSystemTrace(snapshot.auditEvents)} /> : null}
      <AppFooter />
    </div>
  );
}
