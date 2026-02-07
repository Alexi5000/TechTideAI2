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

for (const target of targets) {
  walkAndClean(target.dir, target.exts);
}
