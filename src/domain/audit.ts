import type { ActorType, AuditEvent, AuditMetadata } from "@/domain/schemas";

export type AuditAggregateType = AuditEvent["aggregateType"];

export type AuditContext = {
  now: () => Date;
  createId: (prefix: string) => string;
};

type CreateAuditEventInput = {
  aggregateType: AuditAggregateType;
  aggregateId: string;
  eventType: string;
  actorType: ActorType;
  actorName: string;
  metadata?: AuditMetadata;
};

export function createAuditEvent(
  input: CreateAuditEventInput,
  context: AuditContext,
): AuditEvent {
  return {
    id: context.createId("audit"),
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    timestamp: context.now().toISOString(),
    actorType: input.actorType,
    actorName: input.actorName,
    metadata: input.metadata ?? {},
  };
}
