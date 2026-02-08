/**
 * Knowledge Ingest Section
 *
 * Self-contained knowledge document ingestion form.
 * Owns its own state via useKnowledgeIngest hook.
 * Uses toast context for user feedback.
 */

import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select } from "@/components/ui/select.js";
import { useKnowledgeIngest } from "@/hooks/use-knowledge-ingest.js";
import { useToastContext } from "@/contexts/toast-context.js";

export function KnowledgeIngestSection() {
  const {
    title, setTitle,
    source, setSource,
    collection, setCollection,
    content, setContent,
    submitting, submit,
  } = useKnowledgeIngest();
  const { success, error: toastError } = useToastContext();

  async function handleIngest() {
    const result = await submit();
    if (result.success) {
      success("Document indexed", "Knowledge base updated successfully.");
    } else {
      toastError(
        result.error === "Title, source, and content are required."
          ? "Missing fields"
          : "Index failed",
        result.error ?? "Unable to index document.",
      );
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">Knowledge Ingest</h2>
        <p className="text-sm text-[var(--muted)]">
          Add new intel or operational docs to the knowledge base.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="doc-title" className="sr-only">Document title</label>
          <Input
            id="doc-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Document title"
          />
        </div>
        <div>
          <label htmlFor="doc-source" className="sr-only">Source</label>
          <Input
            id="doc-source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Source (URL, file name, or note)"
          />
        </div>
        <div>
          <label htmlFor="doc-collection" className="sr-only">Collection</label>
          <Select id="doc-collection" value={collection} onChange={(event) => setCollection(event.target.value)}>
            <option value="market-intel">market-intel</option>
            <option value="architecture">architecture</option>
            <option value="policies">policies</option>
            <option value="operations">operations</option>
            <option value="guides">guides</option>
          </Select>
        </div>
        <div>
          <label htmlFor="doc-content" className="sr-only">Document content</label>
          <Textarea
            id="doc-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste the document content here..."
            rows={6}
          />
        </div>
        <Button onClick={handleIngest} disabled={submitting}>
          {submitting ? "Indexing..." : "Index Document"}
        </Button>
      </div>
    </Card>
  );
}
