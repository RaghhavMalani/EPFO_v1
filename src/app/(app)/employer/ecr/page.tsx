import { redirect } from "next/navigation";
import { experienceV2Service } from "@/application/service-instance";

export default function EcrIndexPage() {
  const { ecrs } = experienceV2Service.getExperience();
  const latest = [...ecrs].toSorted((a, b) => b.month.localeCompare(a.month)).at(0);
  redirect(latest ? `/employer/ecr/${latest.id}` : "/employer");
}
