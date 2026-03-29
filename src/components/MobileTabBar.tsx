"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/recipes", label: "Recipes", icon: "📖" },
  { href: "/meal-plans", label: "Plans", icon: "📅" },
  { href: "/gifts", label: "Gifts", icon: "🎁" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-warm-200">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "text-xs transition-colors",
                isActive
                  ? "text-accent font-medium"
                  : "text-warm-600 hover:text-warm-800",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
