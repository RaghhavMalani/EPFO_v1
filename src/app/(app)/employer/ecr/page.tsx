import { redirect } from "next/navigation";
import { loadSession } from "@/application/session";

export default async function EcrIndexPage() {
  const { experienceV2Service } = await loadSession();
  const { ecrs } = experienceV2Service.getExperience();
  const latest = [...ecrs].toSorted((a, b) => b.month.localeCompare(a.month)).at(0);
  redirect(latest ? `/employer/ecr/${latest.id}` : "/employer");
}
