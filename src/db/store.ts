/**
 * Where the JSON document lives. The repository keeps the whole dataset in
 * memory and calls `save` after every write, so a store only needs to hold
 * one string.
 */
export interface DocumentStore {
  load(): string | null;
  save(json: string): void;
}

/** Test store, and a fallback when persistence is unavailable. */
export class MemoryStore implements DocumentStore {
  constructor(private json: string | null = null) {}
  load(): string | null {
    return this.json;
  }
  save(json: string): void {
    this.json = json;
  }
}
