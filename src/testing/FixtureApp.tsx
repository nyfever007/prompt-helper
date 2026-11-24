"use client";

import { useMemo } from "react";
import { PrompterApp } from "@/components/PrompterApp";
import type { KeyValueStore } from "@/domain";
import { FIXTURE_MARKER, getFixtureRegistry } from "./fixtureCatalog";

/** Keys are prefixed so the fixture page can never read or write real user data. */
const NAMESPACE = "prompter-e2e-fixture:";
const namespacedLocalStorage = (): KeyValueStore | null => {
  try {
    const ls = window.localStorage;
    return {
      getItem: (k) => ls.getItem(NAMESPACE + k),
      setItem: (k, v) => ls.setItem(NAMESPACE + k, v),
      removeItem: (k) => ls.removeItem(NAMESPACE + k),
    };
  } catch {
    return null;
  }
};

export function FixtureApp() {
  const store = useMemo(() => (typeof window === "undefined" ? null : namespacedLocalStorage()), []);
  return (
    <>
      <p className="fixture-banner" role="note" data-marker={FIXTURE_MARKER}>
        E2E 테스트 전용 카탈로그 — 제품 화면이 아닙니다 · TEST-ONLY FIXTURE CATALOG (not product content)
      </p>
      <PrompterApp registry={getFixtureRegistry()} store={store} />
    </>
  );
}
