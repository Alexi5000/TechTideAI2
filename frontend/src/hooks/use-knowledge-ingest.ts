/**
 * Knowledge Ingest Hook
 *
 * Manages knowledge document ingestion form state and API submission.
 * Returns a result object from submit() instead of calling toasts directly,
 * separating the data concern from the presentation concern.
 */

import { useState } from "react";
import { apiClient } from "@/lib/api-client.js";

interface SubmitResult {
  success: boolean;
  error?: string | undefined;
}

interface UseKnowledgeIngestResult {
  title: string;
  setTitle: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  collection: string;
  setCollection: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  submitting: boolean;
  submit: () => Promise<SubmitResult>;
}

export function useKnowledgeIngest(): UseKnowledgeIngestResult {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [collection, setCollection] = useState("market-intel");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<SubmitResult> {
    if (!title.trim() || !source.trim() || !content.trim()) {
      return { success: false, error: "Title, source, and content are required." };
    }
    setSubmitting(true);
    try {
      await apiClient.indexKnowledgeDocument({
        title: title.trim(),
        source: source.trim(),
        collection,
        content: content.trim(),
      });
      setTitle("");
      setSource("");
      setContent("");
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unable to index document.",
      };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    title, setTitle,
    source, setSource,
    collection, setCollection,
    content, setContent,
    submitting, submit,
  };
}
