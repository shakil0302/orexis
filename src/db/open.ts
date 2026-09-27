import { Platform } from "react-native";
import { Repo } from "./repo";
import { MemoryStore, type DocumentStore } from "./store";

const WEB_KEY = "orexis.document";
const NATIVE_FILE = "orexis.json";

let repo: Repo | null = null;

function webStore(): DocumentStore {
  try {
    const ls = globalThis.localStorage;
    ls.getItem(WEB_KEY);
    return {
      load: () => ls.getItem(WEB_KEY),
      save: (json) => ls.setItem(WEB_KEY, json),
    };
  } catch {
    // Storage blocked (private mode, disabled site data). The app still runs for the session.
    return new MemoryStore();
  }
}

function nativeStore(): DocumentStore {
  // Loaded lazily: expo-file-system has no web build.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
  const file = new File(Paths.document, NATIVE_FILE);
  return {
    load: () => (file.exists ? file.textSync() : null),
    save: (json) => file.write(json),
  };
}

/** Opens (once) the on-device document and returns the repository. */
export function getRepo(): Repo {
  if (repo) return repo;
  repo = new Repo(Platform.OS === "web" ? webStore() : nativeStore());
  return repo;
}
