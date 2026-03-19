import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calculator,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { to: "/calculator", label: "Costing Calculator", icon: Calculator },
  { to: "/records", label: "Cost Records", icon: FileText },
  { to: "/value-costing", label: "Value Costing", icon: TrendingUp },
  { to: "/masters", label: "Masters", icon: Database },
  {
    to: "/production-records",
    label: "Production Records",
    icon: ClipboardList,
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-sidebar-primary/20 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-sidebar-foreground font-display font-semibold text-sm leading-tight">
                Paper & Board
              </p>
              <p className="text-sidebar-foreground/50 text-xs">
                Costing System
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-ocid={`nav.${label.toLowerCase().replace(/ /g, "_")}.link`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-sidebar-foreground/30 text-xs text-center">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-sidebar-foreground/50"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
