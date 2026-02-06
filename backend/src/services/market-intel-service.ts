import { env } from "../config/env.js";
import type {
  IKnowledgeRepository,
  IKnowledgeVectorRepository,
  KnowledgeSearchResult,
} from "../repositories/types.js";
import { createKnowledgeService } from "./knowledge-service.js";
import { generateText } from "./llm.js";

const DEFAULT_MODELS = {
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
} as const;

export interface MarketIntelRequest {
  orgId: string;
  query: string;
  provider?: "openai" | "anthropic";
  model?: string;
  collections?: string[] | null;
}

export interface MarketIntelSource {
  title: string;
  source: string;
  documentId: string;
  chunkId: string;
}

export interface MarketIntelMatch {
  content: string;
  documentId: string;
  chunkId: string;
}

export interface MarketIntelResponse {
  summary: string;
  sources: MarketIntelSource[];
  matches: MarketIntelMatch[];
  provider: string;
  model: string;
}

function buildEvidencePrompt(results: KnowledgeSearchResult[], query: string) {
  const snippets = results
    .map((result, index) => {
      const content = result.content.length > 600
        ? `${result.content.slice(0, 600)}...`
        : result.content;
      return `Source ${index + 1} (${result.title}): ${content}`;
    })
    .join("\n\n");

  return `You are a market intelligence analyst. Summarize the evidence below for the query: "${query}".\n\n` +
    "Provide a concise executive summary followed by 3-5 bullet insights. " +
    "If evidence is thin, say so. Do not fabricate details.\n\n" +
    `Evidence:\n${snippets}`;
}

export function createMarketIntelService(deps: {
  repository: IKnowledgeRepository;
  vectorRepository: IKnowledgeVectorRepository;
}) {
  const knowledgeService = createKnowledgeService({
    repository: deps.repository,
    vectorRepository: deps.vectorRepository,
  });

  return {
    async summarize(request: MarketIntelRequest): Promise<MarketIntelResponse> {
      const collections = request.collections ?? ["market-intel"];
      const results = await knowledgeService.search(
        request.orgId,
        request.query,
        5,
        collections,
      );

      const provider = request.provider ?? env.DEFAULT_LLM_PROVIDER;
      const model = request.model ?? DEFAULT_MODELS[provider];

      if (results.length === 0) {
        return {
          summary: `No relevant knowledge found for query: "${request.query}"`,
          sources: [],
          matches: [],
          provider,
          model,
        };
      }

      const response = await generateText({
        provider,
        model,
        input: buildEvidencePrompt(results, request.query),
        temperature: 0.2,
        maxTokens: 600,
      });

      const sources = results.map((result) => ({
        title: result.title,
        source: result.source,
        documentId: result.documentId,
        chunkId: result.chunkId,
      }));

      const matches = results.map((result) => ({
        content: result.content,
        documentId: result.documentId,
        chunkId: result.chunkId,
      }));

      return {
        summary: response.text,
        sources,
        matches,
        provider: response.provider,
        model: response.model,
      };
    },
  };
}
