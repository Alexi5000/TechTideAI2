import { Mastra } from "@mastra/core/mastra";
import { mastraAgents } from "./agents.js";

export const mastra = new Mastra({
  agents: mastraAgents,
});

export { mastraAgents, createMastraAgents } from "./agents.js";
