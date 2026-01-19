"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import SignInButton from "./SigninButton";
import UserAccountNav from "./UserAccountNav";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const navClass = (href: string) =>
    cn(
      "rounded-md px-4 py-2 text-sm font-medium transition",
      pathname === href
        ? "bg-gray-100 dark:bg-gray-800"
        : "hover:bg-gray-100 dark:hover:bg-gray-800"
    );

  return (
    <nav className="fixed inset-x-0 top-0 z-[10] border-b bg-white dark:bg-gray-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
        {/* LEFT: Brand */}
        <Link href="/" className="flex items-center">
          <span className="rounded-lg border-2 border-b-4 border-r-4 border-black px-3 py-1 text-lg font-bold transition-all hover:-translate-y-[2px] dark:border-white">
            LearnForge
          </span>
        </Link>

        {/* CENTER */}
        <div className="mx-auto flex items-center gap-3">
          <Link href="/" className={navClass("/")}>
            Home
          </Link>

          <Link href="/explore" className={navClass("/explore")}>
            Explore
          </Link>

          <Link href="/gallery" className={navClass("/gallery")}>
            Gallery
          </Link>

          {status === "authenticated" && (
            <>
              <Link href="/create" className={navClass("/create")}>
                Create Course
              </Link>

              <Link href="/settings" className={navClass("/settings")}>
                Settings
              </Link>
            </>
          )}

          <ThemeToggle />
        </div>

        {/* RIGHT */}
        <div className="flex items-center">
          {status === "authenticated" ? (
            <UserAccountNav user={session!.user} />
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
