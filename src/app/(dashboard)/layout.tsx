import { Suspense } from "react";
import { FilterBar } from "@/components/layout/filter-bar";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";

// Every dashboard page reads the database at request time (never at build time).
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex items-start gap-2 px-4 py-3 md:px-6">
            <MobileNav />
            <Suspense>
              <FilterBar />
            </Suspense>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
