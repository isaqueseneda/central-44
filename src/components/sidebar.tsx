"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Receipt,
  MapPin,
  Users,
  Handshake,
  Truck,
  Package,
  Wrench,
  Menu,
  Route,
  Sun,
  Moon,
  Settings,
  ClipboardCheck,
  Camera,
  CircleDollarSign,
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
import { useTheme } from "next-themes";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  badge?: string;
  disabled?: boolean;
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
      { label: "Itinerários", icon: Route, href: "/itinerarios" },
      { label: "Despesas", icon: Receipt, href: "/despesas", badge: "Em breve", disabled: true },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Lojas", icon: MapPin, href: "/lojas" },
      { label: "Funcionários", icon: Users, href: "/funcionarios" },
      { label: "Equipes", icon: Handshake, href: "/equipes" },
      { label: "Frota", icon: Truck, href: "/frota" },
      { label: "Materiais", icon: Package, href: "/materiais" },
      { label: "Serviços", icon: Wrench, href: "/servicos" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Digitalizar OS", icon: Camera, href: "#", badge: "Em breve", disabled: true },
      { label: "Ajustes", icon: Settings, href: "/ajustes" },
      { label: "Revisar Dados", icon: ClipboardCheck, href: "/revisar-dados" },
      { label: "Atualizar Pedágios", icon: CircleDollarSign, href: "/atualizar-pedagios" },
    ],
  },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
      title="Alternar tema"
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 block dark:hidden" />
      <span className="dark:hidden">Modo escuro</span>
      <span className="hidden dark:inline">Modo claro</span>
    </button>
  );
}

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Logo — wordmark is already in the image */}
      <div className="flex items-center border-b border-border px-5 py-4">
        <img
          src="/logo-central.png"
          alt="Central Engenharia Elétrica"
          className="h-8 dark:brightness-0 dark:invert"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </span>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                      {item.badge && (
                        <span className="ml-auto text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme Toggle & Version */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <ThemeToggle />
        <span className="text-xs text-muted-foreground px-3">v0.1.0</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border md:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
      <img
        src="/logo-central.png"
        alt="Central Engenharia Elétrica"
        className="h-6 dark:brightness-0 dark:invert"
      />
    </div>
  );
}
