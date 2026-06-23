/**
 * Approval Routes - Presentation Layer
 *
 * HTTP handlers for the approval gate. Pending requests are listed; operators
 * grant/deny with optional rationale; the audit log is preserved on every
 * decision via `ApprovalRequest.decidedAt` + `decidedBy`.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import {
  ApprovalAlreadyDecidedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
} from "../domain/index.js";
import {
  createInMemoryApprovalRepository,
} from "../repositories/approval-repository.js";
import { ApprovalService } from "../services/approval-service.js";

const repo = createInMemoryApprovalRepository();
const service = new ApprovalService({ repository: repo, ttlSeconds: 60 * 60 * 24 });

const listQuerySchema = z.object({
  status: z.enum(["pending", "granted", "denied", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const decideSchema = z.object({
  decidedBy: z.string().min(1).max(200).default("anonymous"),
  rationale: z.string().max(2000).optional(),
});

export async function registerApprovalRoutes(app: FastifyInstance): Promise<void> {
  const handleDomainError = (error: unknown, reply: FastifyReply): FastifyReply => {
    if (error instanceof ApprovalNotFoundError) return reply.status(404).send({ error: "Not Found", message: error.message });
    if (error instanceof ApprovalAlreadyDecidedError) return reply.status(409).send({ error: "Conflict", message: error.message });
    if (error instanceof ApprovalExpiredError) return reply.status(410).send({ error: "Gone", message: error.message });
    throw error;
  };

  // GET /api/approvals - list approvals.
  app.get("/api/approvals", async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const approvals = await service.list({ status: query.status, limit: query.limit });
    return reply.send(approvals);
  });

  // GET /api/approvals/:id - one approval.
  app.get<{ Params: { id: string } }>("/api/approvals/:id", async (request, reply) => {
    const id = z.string().uuid().parse(request.params.id);
    const approval = await service.findById(id);
    if (!approval) return reply.status(404).send({ error: "Not Found", message: "approval not found" });
    return reply.send(approval);
  });

  // POST /api/approvals/:id/grant - grant.
  app.post<{ Params: { id: string } }>("/api/approvals/:id/grant", async (request, reply) => {
    try {
      const id = z.string().uuid().parse(request.params.id);
      const body = decideSchema.parse(request.body ?? {});
      const approval = await service.grant(id, body.decidedBy, body.rationale);
      return reply.send(approval);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/approvals/:id/deny - deny.
  app.post<{ Params: { id: string } }>("/api/approvals/:id/deny", async (request, reply) => {
    try {
      const id = z.string().uuid().parse(request.params.id);
      const body = decideSchema.parse(request.body ?? {});
      const approval = await service.deny(id, body.decidedBy, body.rationale);
      return reply.send(approval);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });
}
