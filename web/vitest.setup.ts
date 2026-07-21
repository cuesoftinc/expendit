import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetDb } from "@/mocks/db";
import { resetAuthProvider } from "@/auth";

/**
 * Node ≥22 ships an experimental `localStorage` global that is undefined
 * unless --localstorage-file is passed, and it shadows jsdom's storage in
 * the jsdom environment. Install a deterministic in-memory Storage so
 * browser-code under test always has a working localStorage.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * jsdom ships no ResizeObserver; Radix primitives (tooltip/popover) size
 * their content with it. A no-op implementation is enough for unit tests.
 */
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: NoopResizeObserver,
    writable: true,
    configurable: true,
  });
}

const globals = globalThis as { localStorage?: Storage };
if (
  typeof globals.localStorage === "undefined" ||
  typeof globals.localStorage?.getItem !== "function"
) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  resetDb();
  resetAuthProvider();
  globalThis.localStorage?.clear();
});
