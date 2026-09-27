import type { Category, Completion, Dish, Order, OrderItem, RuleSnapshot } from "../domain/types";

export const DOCUMENT_VERSION = 1;

/** The entire dataset as one serialisable object. */
export interface Document {
  version: number;
  categories: Category[];
  dishes: Dish[];
  snapshots: RuleSnapshot[];
  orders: Order[];
  orderItems: OrderItem[];
  completions: Completion[];
}

export function emptyDocument(): Document {
  return {
    version: DOCUMENT_VERSION,
    categories: [],
    dishes: [],
    snapshots: [],
    orders: [],
    orderItems: [],
    completions: [],
  };
}

/**
 * Parses stored JSON into a Document, upgrading older versions in place.
 * Throws on anything that is not a recognisable document, so a corrupt
 * store is noticed rather than silently replaced.
 */
export function parseDocument(json: string): Document {
  const raw = JSON.parse(json) as Partial<Document> | null;
  if (!raw || typeof raw !== "object" || typeof raw.version !== "number") {
    throw new Error("Not an Orexis document");
  }
  if (raw.version > DOCUMENT_VERSION) {
    throw new Error(`Document version ${raw.version} is newer than this app understands`);
  }
  const doc: Document = {
    ...emptyDocument(),
    ...raw,
    version: DOCUMENT_VERSION,
  };
  for (const key of ["categories", "dishes", "snapshots", "orders", "orderItems", "completions"] as const) {
    if (!Array.isArray(doc[key])) throw new Error(`Document field ${key} is not a list`);
  }
  return doc;
}

export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc);
}
