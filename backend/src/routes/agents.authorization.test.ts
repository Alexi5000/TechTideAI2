import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(() => ({getUser:vi.fn(),membership:vi.fn(),execute:vi.fn()}));
vi.mock("../services/supabase.js", () => ({supabase:{auth:{getUser:mocks.getUser},from:() => ({select:() => ({eq:() => ({eq:() => ({maybeSingle:mocks.membership})})})})}}));
vi.mock("../services/index.js", () => ({
  createAgentExecutionService:() => ({executeAgent:mocks.execute}),
  createAgentLookup:() => ({}),
  ApprovalService:class {},
}));
import { registerAgentRoutes } from "./agents.js";

const org="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
describe("agent execution authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    mocks.execute.mockResolvedValue({id:"run"});
  });
  it("requires authenticated authorized organization membership before execution", async () => {
    const app=Fastify(); await registerAgentRoutes(app);
    const req={method:"POST" as const,url:"/api/agents/test/run",payload:{orgId:org,input:{}}};
    expect((await app.inject(req)).statusCode).toBe(401);
    mocks.membership.mockResolvedValue({data:{role:"member"},error:null});
    expect((await app.inject({...req,headers:{authorization:"Bearer token"}})).statusCode).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    expect((await app.inject({...req,headers:{authorization:"Bearer token"}})).statusCode).toBe(202);
    expect(mocks.execute).toHaveBeenCalledWith("test",{},org);
    await app.close();
  });
  it("does not accept an implicit default organization", async () => {
    const app=Fastify(); await registerAgentRoutes(app);
    const res=await app.inject({method:"POST",url:"/api/agents/test/run",headers:{authorization:"Bearer token"},payload:{input:{}}});
    expect(res.statusCode).not.toBe(202);
    expect(mocks.execute).not.toHaveBeenCalled();
    await app.close();
  });
});
