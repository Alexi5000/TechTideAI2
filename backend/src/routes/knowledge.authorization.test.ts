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

  it.each([
    { method: "POST" as const, url: "/api/knowledge/search", payload: body },
    { method: "POST" as const, url: "/api/knowledge/documents", payload: {orgId:org,title:"t",source:"s",content:"text"} },
    { method: "GET" as const, url: `/api/knowledge/documents/${doc}?orgId=${org}` },
  ])("limits $method $url before authorization", async (request) => {
    const server = await app();
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    mocks.indexDocument.mockResolvedValue({document:{},chunkCount:1});
    mocks.getDocument.mockResolvedValue(null);
    const inject = () => server.inject({...request, headers:{authorization:"Bearer token"}});
    for (let i = 0; i < 60; i++) expect((await inject()).statusCode).not.toBe(429);
    const calls = [mocks.getUser, mocks.membership, mocks.search, mocks.getDocument, mocks.indexDocument].map(mock => mock.mock.calls.length);
    expect((await inject()).statusCode).toBe(429);
    expect([mocks.getUser, mocks.membership, mocks.search, mocks.getDocument, mocks.indexDocument].map(mock => mock.mock.calls.length)).toEqual(calls);
    await server.close();
  });

  it("keeps quotas separate by IP and endpoint and ignores untrusted forwarded IPs", async () => {
    const server = await app();
    const request = { method: "POST" as const, url: "/api/knowledge/search", payload: body, headers: {authorization:"Bearer token"} };
    for (let i = 0; i < 60; i++) {
      expect((await server.inject({...request, remoteAddress:"192.0.2.1"})).statusCode).toBe(200);
    }
    expect((await server.inject({...request, remoteAddress:"192.0.2.1", headers:{...request.headers,"x-forwarded-for":"192.0.2.99"}})).statusCode).toBe(429);
    expect((await server.inject({...request, remoteAddress:"192.0.2.2"})).statusCode).toBe(200);
    expect((await server.inject({method:"GET",url:`/api/knowledge/documents/${doc}?orgId=${org}`,remoteAddress:"192.0.2.1",headers:request.headers})).statusCode).toBe(404);
    await server.close();
  });

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
