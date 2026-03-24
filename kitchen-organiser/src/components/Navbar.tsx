import Link from "next/link";
import Image from "next/image";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal Plans" },
  { href: "/events", label: "Events" },
  { href: "/gifts", label: "Gifts" },
  { href: "/brain-dump", label: "Brain Dump" },
];

export default async function Navbar() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-warm-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl font-semibold text-warm-800 whitespace-nowrap shrink-0"
        >
          The Kitchen Organiser
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800 hover:bg-warm-100 rounded-card transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User avatar */}
        {user ? (
          <Link
            href="/profile"
            className="shrink-0 w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm overflow-hidden hover:opacity-90 transition-opacity"
            title={user.name}
          >
            {user.avatarFilename ? (
              <Image
                src={`/avatars/${user.avatarFilename}`}
                alt={user.name}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </Link>
        ) : (
          <Link
            href="/profile"
            className="shrink-0 w-9 h-9 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 hover:bg-warm-300 transition-colors"
            title="Select profile"
          >
            <span className="text-sm">👤</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
