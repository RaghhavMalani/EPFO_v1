import { EpfoApplicationService } from "@/application/epfo-service";
import { ExperienceV2ApplicationService } from "@/application/experience-v2-service";
import { syntheticRepository } from "@/repositories/synthetic-repository";

export const epfoService = new EpfoApplicationService(syntheticRepository);
export const experienceV2Service = new ExperienceV2ApplicationService(syntheticRepository);
