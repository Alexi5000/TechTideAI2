import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), membership: vi.fn(), search: vi.fn(), getDocument: vi.fn(), indexDocument: vi.fn(),
}));
vi.mock("../repositories/index.js", () => ({ createKnowledgeRepository: vi.fn(), createKnowledgeVectorRepository: vi.fn() }));
vi.mock("../services/index.js", () => ({
  supabase: { auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.membership }) }) }) }) },
  createKnowledgeService: () => ({ search: mocks.search, getDocument: mocks.getDocument, indexDocument: mocks.indexDocument }),
}));
import { registerKnowledgeRoutes } from "./knowledge.js";

const org = "aaaaaaaa-4abc-4def-8abc-123456789abc";
const other = "aaaaaaaa-4def-4abc-8abc-123456789abc";
const doc = "bbbbbbbb-4abc-4def-8abc-123456789abc";
const body = { orgId: org, query: "search phrase", limit: 3 };

describe("knowledge authorization boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
    mocks.membership.mockResolvedValue({ data: { role: "member" }, error: null });
    mocks.search.mockResolvedValue([]);
  });
  const app = async () => { const server = Fastify(); await registerKnowledgeRoutes(server); return server; };

  it("rejects missing and invalid bearer tokens", async () => {
    const server = await app();
    expect((await server.inject({method:"POST",url:"/api/knowledge/search",payload:body})).statusCode).toBe(401);
    mocks.getUser.mockResolvedValue({data:{user:null},error:{message:"invalid"}});
    expect((await server.inject({method:"POST",url:"/api/knowledge/search",headers:{authorization:"Bearer bad"},payload:body})).statusCode).toBe(401);
    expect(mocks.search).not.toHaveBeenCalled();
    await server.close();
  });

  it("checks current membership for every search, including revoked and forged org", async () => {
    const server = await app();
    const req = {method:"POST" as const,url:"/api/knowledge/search",headers:{authorization:"Bearer token"}};
    expect((await server.inject({...req,payload:body})).statusCode).toBe(200);
    mocks.membership.mockResolvedValue({data:null,error:null});
    expect((await server.inject({...req,payload:body})).statusCode).toBe(403);
    expect((await server.inject({...req,payload:{...body,orgId:other}})).statusCode).toBe(403);
    expect(mocks.search).toHaveBeenCalledTimes(1);
    await server.close();
  });

  it("scopes document lookup and denies member writes", async () => {
    const server = await app();
    mocks.getDocument.mockResolvedValue(null);
    expect((await server.inject({method:"GET",url:`/api/knowledge/documents/${doc}?orgId=${org}`,headers:{authorization:"Bearer token"}})).statusCode).toBe(404);
    expect(mocks.getDocument).toHaveBeenCalledWith(doc, org);
    expect((await server.inject({method:"POST",url:"/api/knowledge/documents",headers:{authorization:"Bearer token"},payload:{orgId:org,title:"t",source:"s",content:"text"}})).statusCode).toBe(403);
    expect(mocks.indexDocument).not.toHaveBeenCalled();
    await server.close();
  });

  it("allows an admin write and fails closed when membership lookup fails", async () => {
    const server = await app();
    const request = {method:"POST" as const,url:"/api/knowledge/documents",headers:{authorization:"Bearer token"},payload:{orgId:org,title:"t",source:"s",content:"text"}};
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    mocks.indexDocument.mockResolvedValue({document:{},chunkCount:1});
    expect((await server.inject(request)).statusCode).toBe(201);
    mocks.membership.mockResolvedValue({data:null,error:{message:"database unavailable"}});
    expect((await server.inject(request)).statusCode).toBe(503);
    expect(mocks.indexDocument).toHaveBeenCalledTimes(1);
    await server.close();
  });
});
