export type MutationScope = "invoices" | "approvals" | "exceptions" | "payments" | "all";

export interface MutationDetail {
  scope: MutationScope;
  timestamp: number;
  entityId?: string;
  sourceTabId?: string;
}

const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    channel = new BroadcastChannel("avarta_mutations");
    channel.onmessage = (event: MessageEvent<MutationDetail>) => {
      if (event.data && event.data.sourceTabId !== TAB_ID) {
        // Dispatch window event so local components react to cross-tab updates
        window.dispatchEvent(new CustomEvent("avarta:mutation", { detail: event.data }));
        window.dispatchEvent(new CustomEvent("avarta-update-counts"));
      }
    };
  }
} catch {
  channel = null;
}

/**
 * Dispatches a mutation notification to local listeners and broadcasts to other open tabs.
 */
export function notifyMutation(scope: MutationScope = "all", entityId?: string) {
  const detail: MutationDetail = {
    scope,
    timestamp: Date.now(),
    entityId,
    sourceTabId: TAB_ID,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("avarta:mutation", { detail }));
    window.dispatchEvent(new CustomEvent("avarta-update-counts"));
  }

  if (channel) {
    try {
      channel.postMessage(detail);
    } catch {
      // BroadcastChannel best effort
    }
  }
}
