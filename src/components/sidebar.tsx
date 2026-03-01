"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Receipt,
  MapPin,
  Users,
  UsersRound,
  Truck,
  Package,
  Wrench,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Operacional",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
      { label: "Ordens de Serviço", icon: ClipboardList, href: "/ordens-de-servico" },
      { label: "Programação", icon: Calendar, href: "/programacao" },
      { label: "Despesas", icon: Receipt, href: "/despesas" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Lojas", icon: MapPin, href: "/lojas" },
      { label: "Funcionários", icon: Users, href: "/funcionarios" },
      { label: "Equipes", icon: UsersRound, href: "/equipes" },
      { label: "Frota", icon: Truck, href: "/frota" },
      { label: "Materiais", icon: Package, href: "/materiais" },
      { label: "Serviços", icon: Wrench, href: "/servicos" },
    ],
  },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-6 py-5">
        <Zap className="h-6 w-6 text-yellow-400" />
        <span className="text-lg font-bold text-white">Central 44</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {group.title}
            </span>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Version */}
      <div className="border-t border-zinc-800 px-6 py-3">
        <span className="text-xs text-zinc-600">v0.1.0</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-800 md:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-zinc-800">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-400" />
        <span className="text-sm font-bold text-white">Central 44</span>
      </div>
    </div>
  );
}
