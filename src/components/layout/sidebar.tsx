"use client";

import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Brand, LogoutButton, NavLinks } from "./nav";

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Brand />
      <div className="flex-1 overflow-y-auto py-2">
        <Suspense>
          <NavLinks onNavigate={onNavigate} />
        </Suspense>
      </div>
      <div className="border-t border-sidebar-border p-3">
        <LogoutButton />
        <p className="px-3 pt-2 text-[11px] text-sidebar-foreground/50">Demo data · not real company data</p>
      </div>
    </div>
  );
}

/** Fixed sidebar on desktop. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
      <SidebarBody />
    </aside>
  );
}

/** Hamburger menu with a slide-in sidebar on mobile. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 border-none p-0 sm:max-w-60" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Dashboard pages</SheetDescription>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
