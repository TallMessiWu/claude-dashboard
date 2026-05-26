/**
 * Shared file-based cache for cross-process cache hits without locks.
 *
 * Pattern: a process that successfully fetches writes the result to a shared
 * file. Subsequent processes (or the same process after restart) read from the
 * file before issuing their own API call. No locking — the first writer wins,
 * concurrent writes are idempotent (last write wins on the same key).
 *
 * This narrows the stampede window from "every cache-miss" to "first cache-miss
 * per TTL window across all processes." Multi-session users no longer pay N×
 * API cost on every restart.
 *
 * @handbook 4.7-cross-process-file-cache
 * @tested scripts/__tests__/file-cache.test.ts
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { debugLog } from './debug.js';

export const FILE_CACHE_DIR = path.join(os.homedir(), '.cache', 'claude-dashboard');

interface FileCacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Resolve a cache file path relative to FILE_CACHE_DIR.
 */
export function fileCachePath(name: string): string {
  return path.join(FILE_CACHE_DIR, name);
}

/**
 * Read cached data from disk. Returns null when the file is missing,
 * malformed, lacks a timestamp, or is older than `ttlSeconds`.
 */
export async function loadFileCache<T>(
  cacheFile: string,
  ttlSeconds: number
): Promise<{ data: T; timestamp: number } | null> {
  try {
    const raw = await readFile(cacheFile, 'utf-8');
    const entry = JSON.parse(raw) as FileCacheEntry<T>;
    if (typeof entry.timestamp !== 'number') return null;
    const ageSeconds = (Date.now() - entry.timestamp) / 1000;
    if (ageSeconds < ttlSeconds) return entry;
    return null;
  } catch {
    return null;
  }
}

/**
 * Write cached data to disk. Best-effort: errors are swallowed and debug-logged
 * so a misconfigured filesystem never breaks the caller. The parent directory
 * is created with 0o700 and the file with 0o600 by default.
 */
export async function saveFileCache<T>(
  cacheFile: string,
  data: T,
  mode: number = 0o600
): Promise<void> {
  try {
    await mkdir(path.dirname(cacheFile), { recursive: true, mode: 0o700 });
    await writeFile(
      cacheFile,
      JSON.stringify({ data, timestamp: Date.now() }),
      { mode }
    );
  } catch (err) {
    debugLog('file-cache', `save failed for ${cacheFile}`, err);
  }
}
