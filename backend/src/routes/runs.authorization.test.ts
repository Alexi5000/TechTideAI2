import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser:vi.fn(), membership:vi.fn(), getRun:vi.fn(), listRuns:vi.fn(), createRun:vi.fn(), cancelRun:vi.fn(), events:vi.fn(), trace:vi.fn(),
}));
vi.mock("../services/supabase.js", () => ({supabase:{
  auth:{getUser:mocks.getUser},
  from:() => ({select:() => ({eq:() => ({eq:() => ({maybeSingle:mocks.membership})})})}),
}}));
vi.mock("../repositories/index.js", () => ({createRunRepository:() => ({findEventsByRunId:mocks.events})}));
vi.mock("../services/run-service.js", () => ({createRunService:() => ({getRun:mocks.getRun,listRuns:mocks.listRuns,createRun:mocks.createRun,cancelRun:mocks.cancelRun})}));
vi.mock("../services/trace-service.js", () => ({traceService:{getTraceTreeForRun:mocks.trace}}));
import { registerRunRoutes } from "./runs.js";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const run = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("run authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});
    mocks.membership.mockResolvedValue({data:{role:"member"},error:null});
    mocks.getRun.mockResolvedValue({id:run,orgId:org});
    mocks.listRuns.mockResolvedValue([]);
  });
  const setup = async () => {const app=Fastify(); await registerRunRoutes(app); return app;};
  it.each([
    {method:"GET" as const,url:`/api/runs?orgId=${org}`},
    {method:"POST" as const,url:"/api/runs",payload:{orgId:org,agentId:"agent"}},
    {method:"GET" as const,url:`/api/runs/${run}`},
    {method:"POST" as const,url:`/api/runs/${run}/cancel`},
    {method:"GET" as const,url:`/api/runs/${run}/events`},
    {method:"GET" as const,url:`/api/runs/${run}/trace`},
  ])("rejects unauthenticated $method $url before repository access", async (request) => {
    const app=await setup();
    expect((await app.inject(request)).statusCode).toBe(401);
    expect(mocks.getRun).not.toHaveBeenCalled();
    expect(mocks.listRuns).not.toHaveBeenCalled();
    expect(mocks.createRun).not.toHaveBeenCalled();
    expect(mocks.cancelRun).not.toHaveBeenCalled();
    expect(mocks.events).not.toHaveBeenCalled();
    expect(mocks.trace).not.toHaveBeenCalled();
    await app.close();
  });
  it("denies nonmembers access to a run and its events", async () => {
    const app=await setup();
    mocks.membership.mockResolvedValue({data:null,error:null});
    const headers={authorization:"Bearer valid"};
    expect((await app.inject({method:"GET",url:`/api/runs/${run}`,headers})).statusCode).toBe(403);
    expect((await app.inject({method:"GET",url:`/api/runs/${run}/events`,headers})).statusCode).toBe(403);
    expect(mocks.events).not.toHaveBeenCalled();
    await app.close();
  });
  it("allows a member to list but not cancel a run", async () => {
    const app=await setup();
    const headers={authorization:"Bearer valid"};
    expect((await app.inject({method:"GET",url:`/api/runs?orgId=${org}`,headers})).statusCode).toBe(200);
    expect((await app.inject({method:"POST",url:`/api/runs/${run}/cancel`,headers})).statusCode).toBe(403);
    expect(mocks.cancelRun).not.toHaveBeenCalled();
    await app.close();
  });
  it("allows an admin to cancel after checking the stored run organization", async () => {
    const app=await setup();
    mocks.membership.mockResolvedValue({data:{role:"admin"},error:null});
    mocks.cancelRun.mockResolvedValue({id:run,orgId:org,status:"canceled"});
    const response=await app.inject({method:"POST",url:`/api/runs/${run}/cancel`,headers:{authorization:"Bearer valid"}});
    expect(response.statusCode).toBe(200);
    expect(mocks.cancelRun).toHaveBeenCalledWith(run);
    await app.close();
  });
  it("fails closed when membership verification fails", async () => {
    const app=await setup();
    mocks.membership.mockResolvedValue({data:null,error:{message:"unavailable"}});
    expect((await app.inject({method:"GET",url:`/api/runs/${run}`,headers:{authorization:"Bearer valid"}})).statusCode).toBe(503);
    await app.close();
  });
  it("rate limits before token verification", async () => {
    const app=await setup();
    const request={method:"GET" as const,url:`/api/runs?orgId=${org}`,headers:{authorization:"Bearer valid"}};
    for (let i=0; i<60; i++) expect((await app.inject(request)).statusCode).toBe(200);
    expect((await app.inject(request)).statusCode).toBe(429);
    expect(mocks.getUser).toHaveBeenCalledTimes(60);
    await app.close();
  });
});
