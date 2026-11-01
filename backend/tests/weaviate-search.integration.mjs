import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import process from 'node:process';
import { test } from 'node:test';
import { URL } from 'node:url';

const baseUrl = process.env.TEST_WEAVIATE_URL;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl ?? '')) throw Error('Set TEST_WEAVIATE_URL to an isolated loopback-only Weaviate');
const load = async (path) => readFile(new URL(path, import.meta.url), 'utf8');
const data = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const domain = data('export class VectorStoreUnavailableError extends Error {}');
const env = data(`export const env = ${JSON.stringify({ WEAVIATE_URL: baseUrl })};`);
const service = (await load('../src/services/weaviate.ts')).replace('"../config/env.js"', JSON.stringify(env)).replace('"../domain/index.js"', JSON.stringify(domain));
const serviceUrl = data(stripTypeScriptTypes(service));
const source = (await load('../src/repositories/knowledge-vector-repository.ts')).replace('"../services/weaviate.js"', JSON.stringify(serviceUrl)).replace('"../domain/index.js"', JSON.stringify(domain));
const { createKnowledgeVectorRepository } = await import(data(stripTypeScriptTypes(source)));

test('vector search enforces tenant and optional collection filters', async () => {
  const repo = createKnowledgeVectorRepository();
  await repo.ensureSchema();
  const schema = await (await globalThis.fetch(`${baseUrl}/v1/schema/KnowledgeChunkV2`)).json();
  assert.equal(schema.properties.find(p => p.name === 'orgId').tokenization, 'field');
  const chunks = [
    { id: 'ef11b5bf-70ce-415b-8809-990000000001', orgId: 'test-org', collection: 'blue', vector: [1, 0] },
    { id: 'ef11b5bf-70ce-415b-8809-990000000002', orgId: 'test-org', collection: 'red', vector: [0.9, 0.1] },
    { id: 'ef11b5bf-70ce-415b-8809-990000000003', orgId: 'other-org', collection: 'blue', vector: [1, 0] },
    { id: 'ef11b5bf-70ce-415b-8809-990000000004', orgId: 'test org', collection: 'blue', vector: [1, 0] },
    { id: 'ef11b5bf-70ce-415b-8809-990000000005', orgId: 'aaaaaaaa-4abc-4def-8abc-123456789abc', collection: 'blue', vector: [1, 0] },
    { id: 'ef11b5bf-70ce-415b-8809-990000000006', orgId: 'aaaaaaaa-4def-4abc-8abc-123456789abc', collection: 'blue', vector: [1, 0] },
  ].map((c, i) => ({...c, vector: [...c.vector, ...Array(510).fill(0)], documentId: `test-document-${i}`, chunkIndex: 0, title: 'test', source: 'test', content: 'synthetic test'}));
  await repo.upsertChunks(chunks);
  for (const c of chunks) assert.equal((await globalThis.fetch(`${baseUrl}/v1/objects/KnowledgeChunkV2/${c.id}`)).status, 200);
  const searchVector = [1, ...Array(511).fill(0)];
  const all = await repo.search({ orgId: 'test-org', vector: searchVector, limit: 10 });
  assert.deepEqual(new Set(all.map(x => x.chunkId)), new Set([chunks[0].id, chunks[1].id]));
  const blue = await repo.search({ orgId: 'test-org', collections: ['blue'], vector: searchVector, limit: 10 });
  assert.deepEqual(blue.map(x => x.chunkId), [chunks[0].id]);
  const hostile = await repo.search({ orgId: 'test-org" } ) { Get {', vector: searchVector, limit: 10 });
  assert.equal(hostile.length, 0);
  await assert.rejects(repo.search({ orgId: '', vector: searchVector, limit: 10 }));
  await assert.rejects(repo.upsertChunks([{ ...chunks[0], orgId: '' }]));
  for (const [org, expected] of [[chunks[4].orgId, chunks[4].id], [chunks[5].orgId, chunks[5].id]]) {
    for (const collections of [undefined, ['blue']]) {
      const found = await repo.search({ orgId: org, collections, vector: searchVector, limit: 10 });
      assert.deepEqual(found.map(x => x.chunkId), [expected]);
    }
  }
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => String(url).endsWith('/v1/schema/KnowledgeChunkV2')
      ? globalThis.Response.json({properties: [{name: 'orgId', dataType: ['text'], tokenization: 'word', indexFilterable: true}]})
      : realFetch(url, options);
    await assert.rejects(repo.search({ orgId: 'test-org', vector: searchVector, limit: 10 }), /Incompatible/);
    await assert.rejects(repo.upsertChunks([chunks[0]]), /Incompatible/);
    globalThis.fetch = async (url, options) => String(url).endsWith('/v1/graphql')
      ? globalThis.Response.json({data: {Get: {KnowledgeChunkV2: [{orgId: 'other-org'}]}}})
      : realFetch(url, options);
    await assert.rejects(repo.search({ orgId: 'test-org', vector: searchVector, limit: 10 }), /cross-tenant/);
    globalThis.fetch = async (url, options) => String(url).endsWith('/v1/graphql')
      ? globalThis.Response.json({data: {Get: {}}})
      : realFetch(url, options);
    await assert.rejects(repo.search({ orgId: 'test-org', vector: searchVector, limit: 10 }), /Invalid/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
