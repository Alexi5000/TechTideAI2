import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import process from 'node:process';
import { test } from 'node:test';
import { URL } from 'node:url';

const baseUrl = process.env.TEST_WEAVIATE_URL;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl ?? '')) throw Error('Use an isolated loopback Weaviate');
const fetchJson = async (path, options = {}) => {
  const r = await globalThis.fetch(`${baseUrl}${path}`, options);
  if (!r.ok) throw Error(`Weaviate HTTP ${r.status} at ${path}`);
  return r.json();
};
const post = body => ({method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
const data = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const domain = data('export class VectorStoreUnavailableError extends Error {}');
const env = data(`export const env = ${JSON.stringify({ WEAVIATE_URL: baseUrl })};`);
const service = (await readFile(new URL('../src/services/weaviate.ts', import.meta.url), 'utf8')).replace('"../config/env.js"', JSON.stringify(env)).replace('"../domain/index.js"', JSON.stringify(domain));
const serviceUrl = data(stripTypeScriptTypes(service));
const source = (await readFile(new URL('../src/repositories/knowledge-vector-repository.ts', import.meta.url), 'utf8')).replace('"../services/weaviate.js"', JSON.stringify(serviceUrl)).replace('"../domain/index.js"', JSON.stringify(domain));
const { createKnowledgeVectorRepository } = await import(data(stripTypeScriptTypes(source)));

test('legacy data blocks implicit cutover even after synthetic copy preserves IDs and vectors', async () => {
  const props = [
    {name:'orgId',dataType:['text']}, {name:'documentId',dataType:['text']},
    {name:'chunkIndex',dataType:['int']}, {name:'title',dataType:['text']},
    {name:'source',dataType:['text']}, {name:'collections',dataType:['text[]']}, {name:'content',dataType:['text']},
  ];
  await fetchJson('/v1/schema', post({class:'KnowledgeChunk', vectorizer:'none', properties:props}));
  const id = 'ef11b5bf-70ce-415b-8809-990000000099';
  const properties = {orgId:'test-org',documentId:'legacy-doc',chunkIndex:0,title:'old',source:'test',collections:['blue'],content:'synthetic'};
  const vector = [1, 0];
  await fetchJson('/v1/objects', post({class:'KnowledgeChunk',id,properties,vector}));
  const repo = createKnowledgeVectorRepository();
  await assert.rejects(repo.ensureSchema(), /requires migration/);
  assert.equal((await globalThis.fetch(`${baseUrl}/v1/schema/KnowledgeChunkV2`)).status, 404);
  const old = await fetchJson(`/v1/objects/KnowledgeChunk/${id}?include=vector`);
  const v2props = props.map(p => p.name === 'orgId' ? {...p, tokenization:'field',indexFilterable:true} : p);
  await fetchJson('/v1/schema', post({class:'KnowledgeChunkV2',vectorizer:'none',properties:v2props}));
  await fetchJson('/v1/objects', post({class:'KnowledgeChunkV2',id:old.id,properties:old.properties,vector:old.vector}));
  const migrated = await fetchJson(`/v1/objects/KnowledgeChunkV2/${id}?include=vector`);
  assert.equal(migrated.id, id);
  assert.deepEqual(migrated.vector, vector);
  assert.deepEqual(migrated.properties, old.properties);
  assert.equal((await fetchJson(`/v1/objects/KnowledgeChunk/${id}`)).id, id);
  await assert.rejects(repo.ensureSchema(), /cutover/);
  await assert.rejects(repo.search({orgId:'test-org',vector,limit:5}), /cutover/);
});
