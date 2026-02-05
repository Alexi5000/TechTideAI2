import { env } from "../config/env.js";
import type {
  IKnowledgeRepository,
  IKnowledgeVectorRepository,
  KnowledgeSearchResult,
  CreateKnowledgeDocumentInput,
  KnowledgeDocument,
} from "../repositories/types.js";
import { embedTexts } from "./embeddings.js";

export interface KnowledgeServiceDeps {
  repository: IKnowledgeRepository;
  vectorRepository: IKnowledgeVectorRepository;
}

export interface KnowledgeIndexResult {
  document: KnowledgeDocument;
  chunkCount: number;
}

function chunkTextByWords(
  content: string,
  chunkWords: number,
  overlapWords: number,
): { content: string; tokenCount: number }[] {
  const words = content.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const safeOverlap = Math.min(overlapWords, Math.max(0, chunkWords - 1));
  const chunks: { content: string; tokenCount: number }[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    const slice = words.slice(start, end);
    chunks.push({
      content: slice.join(" "),
      tokenCount: slice.length,
    });

    if (end >= words.length) {
      break;
    }

    start = Math.max(0, end - safeOverlap);
  }

  return chunks;
}

async function embedInBatches(
  texts: string[],
  batchSize: number,
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedTexts(batch);
    results.push(...vectors);
  }
  return results;
}

export function createKnowledgeService(
  deps: KnowledgeServiceDeps,
) {
  const { repository, vectorRepository } = deps;

  return {
    async getDocument(id: string): Promise<KnowledgeDocument | null> {
      return repository.getDocument(id);
    },

    async indexDocument(
      input: CreateKnowledgeDocumentInput,
    ): Promise<KnowledgeIndexResult> {
      const document = await repository.createDocument(input);

      const chunks = chunkTextByWords(
        input.content,
        env.KNOWLEDGE_CHUNK_WORDS,
        env.KNOWLEDGE_CHUNK_OVERLAP_WORDS,
      );

      const persistedChunks = await repository.addChunks(
        document.id,
        document.orgId,
        chunks.map((chunk, index) => ({
          content: chunk.content,
          chunkIndex: index,
          tokenCount: chunk.tokenCount,
        })),
      );

      await vectorRepository.ensureSchema();

      const vectors = await embedInBatches(
        persistedChunks.map((chunk) => chunk.content),
        env.KNOWLEDGE_EMBED_BATCH_SIZE,
      );

      await vectorRepository.upsertChunks(
        persistedChunks.map((chunk, index) => ({
          id: chunk.id,
          orgId: document.orgId,
          documentId: document.id,
          chunkIndex: chunk.chunkIndex,
          title: document.title,
          source: document.source,
          collection: document.collection,
          content: chunk.content,
          vector: vectors[index] ?? [],
        })),
      );

      const indexedAt = new Date().toISOString();
      await repository.markIndexed(document.id, indexedAt);

      return {
        document: {
          ...document,
          indexedAt,
        },
        chunkCount: persistedChunks.length,
      };
    },

    async search(
      orgId: string,
      query: string,
      limit: number,
      collections?: string[] | null,
    ): Promise<KnowledgeSearchResult[]> {
      await vectorRepository.ensureSchema();
      const [vector] = await embedInBatches([query], 1);
      if (!vector) {
        throw new Error("Failed to generate embedding for search query");
      }
      return vectorRepository.search({
        orgId,
        vector,
        limit,
        collections,
      });
    },
  };
}
