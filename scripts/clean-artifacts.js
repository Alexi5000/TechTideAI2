const fs = require("node:fs");
const path = require("node:path");

const targets = [
  { dir: "frontend/src", exts: new Set([".js", ".map"]) },
  { dir: "apis/src", exts: new Set([".js", ".map"]) },
];

function removeFile(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
    process.stdout.write(`Removed ${filePath}\n`);
  } catch (error) {
    process.stderr.write(`Failed to remove ${filePath}: ${error.message}\n`);
  }
}

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
  process.stdout.write(`Removed ${dirPath}/\n`);
}

function walkAndClean(dir, exts) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndClean(fullPath, exts);
      continue;
    }
    const ext = path.extname(entry.name);
    const isDts = entry.name.endsWith(".d.ts");
    if (exts.has(ext) || isDts) {
      removeFile(fullPath);
    }
  }
}

function walkAndRemoveByPattern(dir, predicate) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      walkAndRemoveByPattern(fullPath, predicate);
    } else if (entry.isFile() && predicate(entry.name)) {
      removeFile(fullPath);
    }
  }
}

// 1. Remove compiled .js/.map/.d.ts from source dirs
for (const target of targets) {
  walkAndClean(target.dir, target.exts);
}

// 2. Remove dist/ directories in all workspaces
const distDirs = ["frontend/dist", "backend/dist", "agents/dist", "apis/dist"];
for (const dir of distDirs) {
  removeDir(dir);
}

// 3. Remove .tsbuildinfo files (skip node_modules)
walkAndRemoveByPattern(".", (name) => name.endsWith(".tsbuildinfo"));

// 4. Remove tmpclaude-* temp files (skip node_modules)
walkAndRemoveByPattern(".", (name) => name.startsWith("tmpclaude-"));

process.stdout.write("Clean complete.\n");
