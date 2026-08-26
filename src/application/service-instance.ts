import { EpfoApplicationService } from "@/application/epfo-service";
import { syntheticRepository } from "@/repositories/synthetic-repository";

export const epfoService = new EpfoApplicationService(syntheticRepository);
