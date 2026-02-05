import {
  createOpenAIClient,
  generateOpenAIEmbeddings,
} from "@techtide/apis";
import { env } from "../config/env.js";
import { EmbeddingProviderUnavailableError } from "../domain/index.js";

type OpenAIClient = ReturnType<typeof createOpenAIClient>;

let _openaiClient: OpenAIClient | undefined;

function getOpenAIClient(): OpenAIClient {
  if (!env.OPENAI_API_KEY) {
    throw new EmbeddingProviderUnavailableError(
      "OPENAI_API_KEY is not set. Embeddings cannot be generated.",
    );
  }
  if (!_openaiClient) {
    _openaiClient = createOpenAIClient(env.OPENAI_API_KEY);
  }
  return _openaiClient;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = getOpenAIClient();

  const response = await generateOpenAIEmbeddings(
    {
      model: env.OPENAI_EMBEDDING_MODEL,
      input: texts,
    },
    client,
  );

  return response.embeddings;
}
