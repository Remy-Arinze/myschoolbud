"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext, useRef, useEffect } from "react";
import gsap from "gsap";
import { Menu, X } from "lucide-react";
import { SchoolBrandMark } from "@/components/layout/SchoolBrandMark";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  badge?: string | number;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  /** Desktop icon-rail mode. Always false inside the mobile drawer. */
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_COLLAPSED_WIDTH = 84;
const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

function MobileBrand() {
  return <SchoolBrandMark size="sm" />;
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) !== '0');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({ hideMobileHeader, ...props }: React.ComponentProps<"div"> & { hideMobileHeader?: boolean }) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar hideMobileHeader={hideMobileHeader} {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { animate, collapsed } = useSidebar();
  const ref = useRef<HTMLDivElement>(null);
  const targetWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!animate) {
      gsap.set(el, { width: targetWidth });
      return;
    }
    gsap.to(el, { width: targetWidth, duration: 0.3, ease: "power2.inOut" });
  }, [animate, targetWidth]);

  return (
    <div
      ref={ref}
      className={cn(
        "desktop-sidebar h-screen py-4 hidden md:flex md:flex-col bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] border-r border-[var(--light-border)] dark:border-[var(--dark-border)] flex-shrink-0 fixed left-0 top-0 z-20 overflow-hidden transition-[padding] duration-300",
        collapsed ? "px-3" : "px-4",
        className
      )}
      style={{ width: targetWidth }}
      {...props}
    >
      {children}
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  hideMobileHeader = false,
  ...props
}: React.ComponentProps<"div"> & { hideMobileHeader?: boolean }) => {
  const sidebarCtx = useSidebar();
  const { open, setOpen } = sidebarCtx;
  const mobileCtx = React.useMemo(
    () => ({ ...sidebarCtx, collapsed: false }),
    [sidebarCtx]
  );
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const isExitingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      isExitingRef.current = false;
      const el = ref.current;
      if (el) {
        gsap.killTweensOf(el);
        gsap.fromTo(el, { x: "-100%", opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power2.inOut", clearProps: "all" });
      }
    } else if (shouldRender && !isExitingRef.current) {
      isExitingRef.current = true;
      const el = ref.current;
      if (!el) {
        setShouldRender(false);
        return;
      }
      gsap.killTweensOf(el);
      gsap.to(el, {
        x: "-100%",
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        onComplete: () => {
          setShouldRender(false);
          isExitingRef.current = false;
        },
      });
    }
  }, [open, shouldRender]);

  return (
    <>
      {!hideMobileHeader && (
        <div
          className={cn(
            "mobile-navbar h-[64px] px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white dark:bg-[var(--dark-bg)] border-b border-gray-100 dark:border-white/10 fixed top-0 w-full z-40 transition-all duration-300"
          )}
          {...props}
        >
          <div className="flex justify-start items-center">
            <MobileBrand />
          </div>
          <div className="flex justify-end z-20">
            <Menu
              className="text-gray-700 dark:text-dark-text-primary cursor-pointer h-6 w-6"
              onClick={() => setOpen(!open)}
            />
          </div>
        </div>
      )}
      {shouldRender && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div
            ref={ref}
            className={cn(
              "mobile-sidebar-drawer absolute top-0 left-0 h-full w-[280px] bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] p-6 flex flex-col justify-between shadow-2xl overflow-hidden",
              className
            )}
            style={{ transform: 'translateX(-100%)', opacity: 0 }}
          >
            <div
              className="absolute right-4 top-4 z-50 text-gray-700 dark:text-dark-text-primary cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </div>
            <SidebarContext.Provider value={mobileCtx}>{children}</SidebarContext.Provider>
          </div>
        </div>
      )}
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  isActive,
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
  props?: LinkProps;
}) => {
  const { setOpen, collapsed } = useSidebar();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const wasActive = useRef(isActive);

  useEffect(() => {
    const el = linkRef.current;
    if (!el) return;
    const becameActive = isActive && !wasActive.current;
    wasActive.current = !!isActive;
    if (!becameActive) return;
    const icon = el.querySelector(".sidebar-link-icon");
    const label = el.querySelector(".sidebar-link-label");
    const tl = gsap.timeline({ defaults: { ease: "back.out(1.8)" } });
    tl.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.45 }, 0);
    if (icon) tl.fromTo(icon, { scale: 0.5, rotate: -25 }, { scale: 1, rotate: 0, duration: 0.55 }, 0);
    if (label) tl.fromTo(label, { x: -8, opacity: 0.4 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, 0.05);
    return () => {
      tl.kill();
    };
  }, [isActive]);

  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const onEnter = () => {
    const el = linkRef.current;
    const icon = el?.querySelector(".sidebar-link-icon");
    if (icon) gsap.fromTo(icon, { y: 0 }, { y: -2, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out", overwrite: "auto" });
    if (collapsed && el) {
      const r = el.getBoundingClientRect();
      setTip({ top: r.top + r.height / 2, left: r.right + 12 });
    }
  };

  const iconWithColor = React.cloneElement(link.icon as React.ReactElement, {
    className: cn(
      (link.icon as React.ReactElement)?.props?.className,
      isActive
        ? "text-[var(--agora-blue)]"
        : "text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] group-hover/sidebar:text-black dark:group-hover/sidebar:text-white"
    ),
  });

  const hasBadge =
    link.badge != null && link.badge !== "" && Number(link.badge) !== 0;
  const badgeText =
    typeof link.badge === "number" && link.badge > 99 ? "99+" : link.badge;

  return (
    <Link
      ref={linkRef}
      href={link.href}
      onMouseEnter={onEnter}
      onMouseLeave={() => setTip(null)}
      onFocus={onEnter}
      onBlur={() => setTip(null)}
      aria-label={link.label}
      className={cn(
        "flex items-center group/sidebar py-2.5 rounded-xl transition-colors relative sidebar-link-item",
        collapsed ? "justify-center px-0" : "justify-between gap-2 px-3",
        isActive
          ? "text-white bg-[var(--agora-blue)] sidebar-link-active"
          : "text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-surface)] border border-transparent sidebar-link-inactive",
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="sidebar-link-icon inline-flex">{iconWithColor}</span>
        {!collapsed && (
          <span
            className={cn(
              "sidebar-link-label font-semibold transition-colors duration-150 inline-block truncate",
              isActive
                ? "text-[var(--agora-blue)]"
                : "text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)]"
            )}
            style={{ fontSize: "var(--text-body)" }}
          >
            {link.label}
          </span>
        )}
        {!collapsed && hasBadge && (
          <span className="ml-0.5 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-[var(--agora-blue)] px-1.5 text-[10px] font-semibold text-white tabular-nums">
            {badgeText}
          </span>
        )}
      </div>
      {collapsed && hasBadge && (
        <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[var(--agora-blue)] ring-2 ring-[var(--light-bg)] dark:ring-[var(--dark-bg)]" />
      )}
      {!collapsed && isActive && (
        <span className="text-white inline-block">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {collapsed && tip && (
        <span
          role="tooltip"
          className="sidebar-tooltip pointer-events-none whitespace-nowrap rounded-xl bg-[var(--agora-blue)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[var(--agora-blue)]/25"
          style={{ position: "fixed", top: tip.top, left: tip.left, transform: "translateY(-50%)", zIndex: 9999 }}
        >
          {link.label}
          <span
            aria-hidden
            className="absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-[var(--agora-blue)]"
          />
        </span>
      )}
    </Link>
  );
};

