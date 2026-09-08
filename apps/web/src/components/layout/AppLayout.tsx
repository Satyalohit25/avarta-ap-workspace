import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";

// Doc 08 §8.7 global page template: Multi-device Responsive Sidebar + TopNav + Content.
export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      // Auto-collapse on tablet (768px - 1024px) per standard practice & user approval
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      if (isTablet) return true;
      return (
        localStorage.getItem("avarta_sidebar_collapsed") === "true" ||
        localStorage.getItem("clearops_sidebar_collapsed") === "true"
      );
    }
    return false;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Handle window resizing to auto-collapse on tablet
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        const saved =
          localStorage.getItem("avarta_sidebar_collapsed") ||
          localStorage.getItem("clearops_sidebar_collapsed");
        if (saved !== null) {
          setIsCollapsed(saved === "true");
        }
      }
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("avarta_sidebar_collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 transition-colors overflow-hidden">
      {/* Dimmed Backdrop Overlay on Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Modern Multi-Device Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DemoRoleSwitcher />
        <TopNav onOpenMobileMenu={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1680px] w-full mx-auto px-3.5 sm:px-5 py-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
