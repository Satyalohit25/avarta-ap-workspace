import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function NetworkStatusAlert() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowRestored(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-caption text-center flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300 font-medium"
      >
        <WifiOff size={16} className="shrink-0" />
        <span>
          You are currently offline. Financial approvals, payments, and exports require an active internet connection.
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white px-4 py-2 text-caption text-center flex items-center justify-center gap-2 shadow-md animate-in fade-in duration-300 font-medium"
    >
      <Wifi size={16} className="shrink-0" />
      <span>Internet connection restored. Avarta AP Workspace is back online.</span>
    </div>
  );
}
