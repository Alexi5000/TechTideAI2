/**
 * Backwards-compatible shim for legacy imports.
 *
 * The canonical tool catalog lives in `tool-catalog.ts`.
 */
import { TOOL_IDS, TOOL_ID_SET, isToolId, type ToolId } from "./tool-catalog.js";

export const IMPLEMENTED_TOOL_IDS = TOOL_IDS;

export type ImplementedToolId = ToolId;

export const IMPLEMENTED_TOOL_SET = TOOL_ID_SET;

export function isImplementedToolId(tool: string): tool is ImplementedToolId {
  return isToolId(tool);
}
