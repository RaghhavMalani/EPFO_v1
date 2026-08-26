import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const globalRepository = globalThis as unknown as {
  epfoOneRepository?: InMemoryEpfoRepository;
};

export const syntheticRepository =
  globalRepository.epfoOneRepository ?? new InMemoryEpfoRepository();

if (process.env.NODE_ENV !== "production") {
  globalRepository.epfoOneRepository = syntheticRepository;
}
