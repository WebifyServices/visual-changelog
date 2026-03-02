import type { ChangelogEntry } from "@schema/types";

const DATA_BASE_URL = import.meta.env.VITE_DATA_URL || "./entries";

export async function loadManifest(): Promise<string[]> {
  try {
    const res = await fetch(`${DATA_BASE_URL}/manifest.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function loadEntry(filename: string): Promise<ChangelogEntry | null> {
  try {
    const res = await fetch(`${DATA_BASE_URL}/${filename}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data as ChangelogEntry;
  } catch {
    return null;
  }
}

export async function loadAllEntries(): Promise<ChangelogEntry[]> {
  const manifest = await loadManifest();
  const results = await Promise.all(manifest.map(loadEntry));
  return results
    .filter((e): e is ChangelogEntry => e !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
