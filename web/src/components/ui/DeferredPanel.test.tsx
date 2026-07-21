import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import DeferredPanel from "./DeferredPanel";

/** Controllable IntersectionObserver stub (jsdom has none). */
class ObserverStub {
  static instances: ObserverStub[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    ObserverStub.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {}
  intersect() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

afterEach(() => {
  ObserverStub.instances = [];
  vi.unstubAllGlobals();
});

describe("DeferredPanel (perf pass 2026-07-21)", () => {
  it("reserves min-height and defers children until intersection", () => {
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    const { container } = render(
      <DeferredPanel minHeight={220}>
        <p>demo panel</p>
      </DeferredPanel>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute("data-deferred", "pending");
    expect(wrapper.style.minHeight).toBe("220px");
    expect(screen.queryByText("demo panel")).toBeNull();

    act(() => ObserverStub.instances[0].intersect());
    expect(screen.getByText("demo panel")).toBeInTheDocument();
    expect(wrapper).toHaveAttribute("data-deferred", "mounted");
    // the reserve hands over to the real content's own height
    expect(wrapper.style.minHeight).toBe("");
  });

  it("mounts immediately where IntersectionObserver is unavailable", () => {
    render(
      <DeferredPanel minHeight={100}>
        <p>fallback content</p>
      </DeferredPanel>,
    );
    expect(screen.getByText("fallback content")).toBeInTheDocument();
  });
});
