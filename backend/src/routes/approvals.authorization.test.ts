import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryApprovalRepository } from "../repositories/approval-repository.js";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), membership: vi.fn() }));
vi.mock("../services/supabase.js", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.membership }) }) }) }),
  },
}));
import { registerApprovalRoutes } from "./approvals.js";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const runId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("approval authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});
    mocks.membership.mockResolvedValue({data:{role:"member"},error:null});
  });
  async function setup() {
    const repo = createInMemoryApprovalRepository();
    const create = (orgId: string) => repo.create({orgId,runId,agentId:"agent",action:"write",payload:{},riskTier:"write",expiresAt:"2099-01-01T00:00:00.000Z"});
    const mine = await create(org);
    const theirs = await create(other);
    const app = Fastify();
    await registerApprovalRoutes(app, repo);
    return { app, repo, mine, theirs };
  }
  it("rejects unauthenticated listing and scopes member results", async () => {
    const {app,mine} = await setup();
    expect((await app.inject({method:"GET",url:`/api/approvals?orgId=${org}`})).statusCode).toBe(401);
    const res = await app.inject({method:"GET",url:`/api/approvals?orgId=${org}`,headers:{authorization:"Bearer valid"}});
    expect(res.statusCode).toBe(200);
    expect(res.json().map((entry: {id:string}) => entry.id)).toEqual([mine.id]);
    await app.close();
  });
  it("prevents member decisions and uses verified admin identity", async () => {
    const {app,mine,repo} = await setup();
    const request = {method:"POST" as const,url:`/api/approvals/${mine.id}/grant`,headers:{authorization:"Bearer valid"},payload:{decidedBy:"forged",rationale:"ok"}};
    expect((await app.inject(request)).statusCode).toBe(403);
    expect((await repo.findById(mine.id))?.status).toBe("pending");
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    const response = await app.inject(request);
    expect(response.statusCode).toBe(200);
    expect(response.json().decidedBy).toBe("verified-user");
    await app.close();
  });
  it("rejects decisions when membership does not cover the approval organization", async () => {
    const {app,theirs} = await setup();
    mocks.membership.mockResolvedValue({data:null,error:null});
    const response = await app.inject({method:"POST",url:`/api/approvals/${theirs.id}/deny`,headers:{authorization:"Bearer valid"},payload:{}});
    expect(response.statusCode).toBe(403);
    await app.close();
  });
  it("fails closed for invalid tokens and membership service errors", async () => {
    const {app,mine,repo} = await setup();
    const request = {method:"POST" as const,url:`/api/approvals/${mine.id}/grant`,headers:{authorization:"Bearer bad"},payload:{}};
    mocks.getUser.mockResolvedValue({data:{user:null},error:{message:"invalid"}});
    expect((await app.inject(request)).statusCode).toBe(401);
    mocks.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});
    mocks.membership.mockResolvedValue({data:null,error:{message:"unavailable"}});
    expect((await app.inject(request)).statusCode).toBe(503);
    expect((await repo.findById(mine.id))?.status).toBe("pending");
    await app.close();
  });
  it("rate limits before authentication", async () => {
    const {app} = await setup();
    const request = {method:"GET" as const,url:`/api/approvals?orgId=${org}`,headers:{authorization:"Bearer valid"}};
    for (let i = 0; i < 60; i++) expect((await app.inject(request)).statusCode).toBe(200);
    expect((await app.inject(request)).statusCode).toBe(429);
    expect(mocks.getUser).toHaveBeenCalledTimes(60);
    await app.close();
  });
});
