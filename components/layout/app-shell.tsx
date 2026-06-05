"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { Session } from "@/types/chat";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AppShellProps {
  sessions: Session[];
  currentSessionId?: string;
  children: React.ReactNode;
}

export function AppShell({
  sessions,
  currentSessionId,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        className="hidden md:flex"
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="打开菜单">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>会话列表</SheetTitle>
              </SheetHeader>
              <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
              />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">Career Decision AI</span>
        </header>
        {children}
      </div>
    </div>
  );
}
