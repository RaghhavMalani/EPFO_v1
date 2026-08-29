import { CheckCircleIcon, ClockIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { epfoService } from "@/application/service-instance";
import { PageHeader, PrototypeNotice } from "@/components/ui";
import { buildMemberActivity, type ActivityTone } from "@/domain/activity-feed";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Activity" };

const TONE_ICON: Record<ActivityTone, typeof CheckCircleIcon> = {
  attention: WarningCircleIcon,
  progress: ClockIcon,
  complete: CheckCircleIcon,
};

export default function ActivityPage() {
  const snapshot = epfoService.getSnapshot();
  const activity = buildMemberActivity(snapshot, snapshot.auditEvents.length);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Account"
        title="Activity"
        description="Every event across your record — what happened, who acted, and when."
        backHref="/"
        backLabel="Home"
      />

      {activity.length === 0 ? (
        <p className="employer-empty panel mt-8">Nothing has happened on this account yet.</p>
      ) : (
        <ul className="activity-ledger mt-8">
          {activity.map((entry) => {
            const Icon = TONE_ICON[entry.tone];
            const body = (
              <>
                <Icon size={17} weight="fill" aria-hidden="true" />
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.detail}</small>
                </span>
                <time dateTime={entry.timestamp} className="tabular">{formatDateTime(entry.timestamp)}</time>
              </>
            );
            return (
              <li key={entry.id} className={`activity-entry activity-entry--${entry.tone}`}>
                {entry.href ? (
                  <Link href={entry.href} className="activity-entry__body link-row">{body}</Link>
                ) : (
                  <div className="activity-entry__body">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <PrototypeNotice compact />
    </div>
  );
}
