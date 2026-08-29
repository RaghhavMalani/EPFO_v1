import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const globalRepository = globalThis as unknown as {
  epfoOneRepository?: InMemoryEpfoRepository;
};

// Next.js compiles Route Handlers and Server Components into separate output
// chunks, each of which evaluates this module independently — in both dev
// (HMR reloads) and, just as importantly, in a production `next start`
// (route handlers and pages simply live in different compiled bundles).
// Without a process-wide handle, each chunk gets its own repository instance
// and mutations made through a command route silently never appear on a page.
// `globalThis` is the one thing every chunk in this Node process actually shares.
export const syntheticRepository =
  globalRepository.epfoOneRepository ?? new InMemoryEpfoRepository();

globalRepository.epfoOneRepository = syntheticRepository;
