/**
 * Shared Jest mocks for screen tests: an in-memory repository behind
 * getRepo(), and a minimal expo-router. Import this before any screen.
 */
import { Repo } from "../db/repo";
import { openTestDb } from "../db/testDb";

const mockState = {
  repo: null as Repo | null,
  params: {} as Record<string, string>,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
};

export const routerMock = mockState.router;

export function resetRepo(): Repo {
  mockState.repo = new Repo(openTestDb());
  return mockState.repo;
}

export function getTestRepo(): Repo {
  if (!mockState.repo) throw new Error("Call resetRepo() first");
  return mockState.repo;
}

export function setSearchParams(p: Record<string, string>) {
  mockState.params = p;
}

jest.mock("../db/open", () => ({
  getRepo: () => mockState.repo,
}));

jest.mock("expo-router", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native");
  return {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, []),
    useLocalSearchParams: () => mockState.params,
    router: mockState.router,
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `redirect:${href}`),
  };
});
