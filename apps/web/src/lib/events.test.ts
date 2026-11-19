import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyMutation } from "./events";

describe("T-301: Real-time UI Freshness & Mutation Bus", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  it("dispatches avarta:mutation and avarta-update-counts when window is available", () => {
    const listeners: Record<string, ((e: any) => void)[]> = {};
    const mockWindow = {
      addEventListener: (type: string, cb: any) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(cb);
      },
      removeEventListener: (type: string, cb: any) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((fn) => fn !== cb);
        }
      },
      dispatchEvent: (evt: any) => {
        const cbs = listeners[evt.type] || [];
        cbs.forEach((fn) => fn(evt));
        return true;
      },
    };

    (globalThis as any).window = mockWindow;
    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, init?: any) {
        this.type = type;
        this.detail = init?.detail;
      }
    };

    const mutationHandler = vi.fn();
    const countHandler = vi.fn();

    mockWindow.addEventListener("avarta:mutation", mutationHandler);
    mockWindow.addEventListener("avarta-update-counts", countHandler);

    notifyMutation("approvals", "inv-test-123");

    expect(mutationHandler).toHaveBeenCalledTimes(1);
    const event = mutationHandler.mock.calls[0][0];
    expect(event.detail.scope).toBe("approvals");
    expect(event.detail.entityId).toBe("inv-test-123");
    expect(typeof event.detail.timestamp).toBe("number");

    expect(countHandler).toHaveBeenCalledTimes(1);
  });
});

