import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Sheet } from "../ui/Sheet";

// Doc 08 §8.7 global page template: Multi-device Responsive Sidebar + TopNav + Content.
export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("avarta_sidebar_collapsed") === "true";
    }
    return false;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
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
      {/* Desktop (lg: 1024px+): Persistent Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={false}
          onCloseMobile={() => {}}
        />
      </div>

      {/* Mobile & Tablet (< 1024px): Left Slide-Over Drawer using Sheet */}
      <Sheet
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        side="left"
        hideHeader
        width="w-64 max-w-[85vw]"
      >
        <Sidebar
          isCollapsed={false}
          onToggleCollapse={() => {}}
          isMobileOpen={true}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav onOpenMobileMenu={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto min-w-0 overflow-x-hidden">
          <div className="w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-3">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
