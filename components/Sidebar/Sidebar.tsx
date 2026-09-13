"use client";
import { useEffect, useState } from "react";
import NavButton from "../NavButton/NavButton";
import { PanelLeftClose, LogOut, PanelLeftOpen } from "lucide-react";

import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { navByRole } from "@/nav.config";

type Item = {
  id: string;
  href: string;
  label: string;
};

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { data: session, status } = useSession();
  const [active, setActive] = useState<string | null>(null);
  const pathname = usePathname() ?? "/";
  const role = session?.user.role as
    | "OWNER"
    | "LEADER"
    | "CALLER"
    | "TEAM"
    | "OTHER";
  const navItems = role ? navByRole[role] : navByRole["OTHER"];
  useEffect(() => {
    if (!navItems?.length) return;

    const current = navItems.find((i) =>
      i.items?.find((ii) => ii.href === pathname),
    );

    setActive(
      current?.items?.find((ii) => ii.href === pathname)?.label || null,
    );
  }, [pathname, navItems]);
  if (status === "loading") {
    return null;
  }
  // if (!session) return null;

  return (
    <>
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 z-20 md:hidden ${
          open ? "opacity-100" : "hidden"
        }`}
        onClick={() => setOpen(false)}
        aria-label="Close menu"
      />

      <aside
        className={`h-screen flex flex-col justify-around sm:justify-between bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]  px-4 py-6  z-50  max-md:fixed max-md:inset-0 transform transition-transform duration-300 ease-in-out ${
          open ? "w-58 max-md:translate-x-0" : "w-15 max-md:-translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            {open && (
              <img src="/Logo.png" alt="Carflex Logo" className=" w-16" />
            )}
            <button
              onClick={() => setOpen(!open)}
              aria-label="Close listings menu"
              className="p-1 rounded-sm  hover:bg-gray-100 cursor-pointer"
            >
              {open ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>
          </div>
          <div className="overflow-auto max-h-[80vh] no-scrollbar">
            {open && (
              <div className="flex flex-col ">
                <div
                  className="flex flex-col gap-2"
                  aria-label="Mobile listings"
                >
                  {navItems.map((box) => {
                    return (
                      <div
                        className="flex flex-col gap-2 mb-4"
                        key={box.title ?? box.items?.[0].id}
                      >
                        <p className="text-gray-500 ">{box.title}</p>

                        {box?.items?.map((item) => {
                          return (
                            <NavButton
                              key={item.id}
                              onClick={() => setActive(item.label)}
                              item={item}
                              isActive={active === item.label}
                              className={`text-left w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors`}
                            >
                              {item.id === "finder" ? <span className="finder-nav-label"><img src="/Logo.png" alt="" className="finder-nav-logo"/><span>{item.label}</span><img src="/carflex-finder-new.png" alt="New feature" className="finder-new-feature"/></span> : item.label}
                            </NavButton>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <a
          onClick={() => {
            signOut({ callbackUrl: "/login" });
          }}
          className={`flex items-center gap-2 text-red-600 cursor-pointer hover:bg-red-100 decoration-none rounded-lg ${
            open ? " px-3 py-2 " : "p-1  "
          }`}
        >
          <LogOut size={20} /> {open && <span>Sign Out</span>}
        </a>
      </aside>
    </>
  );
}
