/**
 * Approval Routes - Presentation Layer
 *
 * HTTP handlers for the approval gate. Pending requests are listed; operators
 * grant/deny with optional rationale; the audit log is preserved on every
 * decision via `ApprovalRequest.decidedAt` + `decidedBy`.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";

import {
  ApprovalAlreadyDecidedError,
  ApprovalExpiredError,
  ApprovalNotFoundError,
} from "../domain/index.js";
import {
  createInMemoryApprovalRepository,
  type IApprovalRepository,
} from "../repositories/approval-repository.js";
import { ApprovalService } from "../services/approval-service.js";
import { supabase } from "../services/supabase.js";

const listQuerySchema = z.object({
  orgId: z.guid().transform((value) => value.toLowerCase()),
  status: z.enum(["pending", "granted", "denied", "expired"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const decideSchema = z.object({
  rationale: z.string().max(2000).nullable().optional(),
});

export async function registerApprovalRoutes(app: FastifyInstance, repo: IApprovalRepository = createInMemoryApprovalRepository()): Promise<void> {
  if (!app.hasDecorator("rateLimit")) await app.register(rateLimit, {global:false});
  const limit = {config:{rateLimit:{max:60,timeWindow:"1 minute"}}};
  const service = new ApprovalService({ repository: repo, ttlSeconds: 60 * 60 * 24 });
  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? "");
    if (!match) { await reply.code(401).send({error:"Unauthorized"}); return null; }
    if (!supabase) { await reply.code(503).send({error:"Authorization unavailable"}); return null; }
    try {
      const {data, error} = await supabase.auth.getUser(match[1]);
      if (error || !data.user) { await reply.code(401).send({error:"Unauthorized"}); return null; }
      return data.user.id;
    } catch { await reply.code(503).send({error:"Authorization unavailable"}); return null; }
  }
  async function authorize(userId: string, orgId: string, write: boolean, reply: FastifyReply): Promise<boolean> {
    if (!supabase) { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
    try {
      const {data, error} = await supabase.from("org_members").select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
      if (error) { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
      if (!data || !["owner", "admin", "member"].includes(data.role) || (write && !["owner", "admin"].includes(data.role))) {
        await reply.code(403).send({error:"Forbidden"}); return false;
      }
      return true;
    } catch { await reply.code(503).send({error:"Authorization unavailable"}); return false; }
  }
  const handleDomainError = (error: unknown, reply: FastifyReply): FastifyReply => {
    if (error instanceof ApprovalNotFoundError) return reply.status(404).send({ error: "Not Found", message: error.message });
    if (error instanceof ApprovalAlreadyDecidedError) return reply.status(409).send({ error: "Conflict", message: error.message });
    if (error instanceof ApprovalExpiredError) return reply.status(410).send({ error: "Gone", message: error.message });
    throw error;
  };

  // GET /api/approvals - list approvals.
  app.get("/api/approvals", limit, async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const query = listQuerySchema.parse(request.query);
    if (!await authorize(user, query.orgId, false, reply)) return;
    const approvals = await service.list({ orgId: query.orgId, status: query.status, limit: query.limit });
    return reply.send(approvals);
  });

  // GET /api/approvals/:id - one approval.
  app.get<{ Params: { id: string } }>("/api/approvals/:id", limit, async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const id = z.guid().parse(request.params.id);
    const approval = await service.findById(id);
    if (!approval) return reply.status(404).send({ error: "Not Found", message: "approval not found" });
    if (!await authorize(user, approval.orgId, false, reply)) return;
    return reply.send(approval);
  });

  // POST /api/approvals/:id/grant - grant.
  app.post<{ Params: { id: string } }>("/api/approvals/:id/grant", limit, async (request, reply) => {
    try {
      const user = await authenticate(request, reply);
      if (!user) return;
      const id = z.guid().parse(request.params.id);
      const existing = await service.findById(id);
      if (!existing) return reply.status(404).send({error:"Not Found"});
      if (!await authorize(user, existing.orgId, true, reply)) return;
      const body = decideSchema.parse(request.body ?? {});
      const approval = await service.grant(id, user, body.rationale ?? undefined);
      return reply.send(approval);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });

  // POST /api/approvals/:id/deny - deny.
  app.post<{ Params: { id: string } }>("/api/approvals/:id/deny", limit, async (request, reply) => {
    try {
      const user = await authenticate(request, reply);
      if (!user) return;
      const id = z.guid().parse(request.params.id);
      const existing = await service.findById(id);
      if (!existing) return reply.status(404).send({error:"Not Found"});
      if (!await authorize(user, existing.orgId, true, reply)) return;
      const body = decideSchema.parse(request.body ?? {});
      const approval = await service.deny(id, user, body.rationale ?? undefined);
      return reply.send(approval);
    } catch (error) {
      return handleDomainError(error, reply);
    }
  });
}
