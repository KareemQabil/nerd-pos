import path from 'node:path';
import { pathToFileURL } from 'node:url';

const appData = process.env.APPDATA;
if (!appData) {
  throw new Error('APPDATA is not set. Repomix local pack cannot locate module.');
}

const repomixBase = path.join(appData, 'npm', 'node_modules', 'repomix', 'lib');
const repomixIndexUrl = pathToFileURL(path.join(repomixBase, 'index.js')).href;
const repomixIndex = await import(repomixIndexUrl);

const { pack, loadFileConfig, mergeConfigs, buildCliConfig } = repomixIndex;

const { readRawFile } = await import(
  pathToFileURL(path.join(repomixBase, 'core', 'file', 'fileRead.js')).href,
);
const { processContent } = await import(
  pathToFileURL(
    path.join(repomixBase, 'core', 'file', 'fileProcessContent.js'),
  ).href,
);
const { TokenCounter } = await import(
  pathToFileURL(
    path.join(repomixBase, 'core', 'metrics', 'TokenCounter.js'),
  ).href,
);

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'repomix-codebase.txt');

const ignorePatterns = [
  'Documentation/**',
  '**/*.md',
  '**/docs/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.npm-cache/**',
  '**/repomix-*.txt',
  '**/repomix-*.xml',
  '**/repomix-*.json',
  '**/.env',
  '**/.env.*',
];

const cliOptions = {
  output: outputPath,
  style: 'plain',
  removeComments: true,
  removeEmptyLines: true,
  truncateBase64: true,
  ignore: ignorePatterns.join(','),
  securityCheck: false,
};

const fileConfig = await loadFileConfig(repoRoot, null);
const cliConfig = buildCliConfig(cliOptions);
const config = mergeConfigs(repoRoot, fileConfig, cliConfig);

config.security.enableSecurityCheck = false;
config.output.git.sortByChanges = false;
config.output.git.includeDiffs = false;
config.output.git.includeLogs = false;

const collectFiles = async (filePaths, rootDir, cfg) => {
  const rawFiles = [];
  const skippedFiles = [];
  for (const filePath of filePaths) {
    const fullPath = path.resolve(rootDir, filePath);
    const result = await readRawFile(fullPath, cfg.input.maxFileSize);
    if (result.content !== null) {
      rawFiles.push({ path: filePath, content: result.content });
    } else if (result.skippedReason) {
      skippedFiles.push({ path: filePath, reason: result.skippedReason });
    }
  }
  return { rawFiles, skippedFiles };
};

const processFiles = async (rawFiles, cfg) => {
  const processedFiles = [];
  for (const rawFile of rawFiles) {
    const content = await processContent(rawFile, cfg);
    processedFiles.push({ path: rawFile.path, content });
  }
  return processedFiles;
};

const validateFileSafety = async (rawFiles) => ({
  safeRawFiles: rawFiles,
  safeFilePaths: rawFiles.map((file) => file.path),
  suspiciousFilesResults: [],
  suspiciousGitDiffResults: [],
  suspiciousGitLogResults: [],
});

const calculateMetrics = async (processedFiles, output, _progress, cfg) => {
  const counter = new TokenCounter(cfg.tokenCount.encoding);
  const outputParts = Array.isArray(output) ? output : [output];
  let totalTokens = 0;
  let totalCharacters = 0;

  for (const part of outputParts) {
    totalTokens += counter.countTokens(part);
    totalCharacters += part.length;
  }

  const fileCharCounts = {};
  const fileTokenCounts = {};
  for (const file of processedFiles) {
    fileCharCounts[file.path] = file.content.length;
  }

  const tokenSample = processedFiles.slice(0, Math.min(processedFiles.length, 25));
  for (const file of tokenSample) {
    fileTokenCounts[file.path] = counter.countTokens(file.content, file.path);
  }

  counter.free();

  return {
    totalFiles: processedFiles.length,
    totalCharacters,
    totalTokens,
    fileCharCounts,
    fileTokenCounts,
    gitDiffTokenCount: 0,
    gitLogTokenCount: 0,
  };
};

const result = await pack(
  [repoRoot],
  config,
  () => {},
  {
    collectFiles,
    processFiles,
    validateFileSafety,
    calculateMetrics,
  },
);

const totalTokens = result.totalTokens ?? 0;
if (totalTokens > 900000) {
  throw new Error(
    `Repomix output exceeds 900k token budget: ${totalTokens}`,
  );
}

// eslint-disable-next-line no-console
console.log(
  `[repomix-local] wrote ${outputPath} (${totalTokens} tokens)`,
);
