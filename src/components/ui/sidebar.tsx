"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext, useRef, useEffect } from "react";
import gsap from "gsap";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

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

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
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
  const { animate } = useSidebar();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !animate) return;
    gsap.to(el, { width: 250, duration: 0.25, ease: "power2.inOut" });
  }, [animate]);

  return (
    <div
      ref={ref}
      className={cn(
        "desktop-sidebar h-screen px-4 py-4 hidden md:flex md:flex-col bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] border-r border-[var(--light-border)] dark:border-[var(--dark-border)] flex-shrink-0 fixed left-0 top-0 z-20",
        className
      )}
      style={{ width: 250 }}
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
  const { open, setOpen } = useSidebar();
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

  const { theme } = useTheme();

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
            <Link href="/" className="flex items-center">
              <img
                src="/assets/logos/agora_main.png"
                alt="Agora"
                className="h-8 w-auto flex-shrink-0"
                style={{ height: '32px' }}
              />
            </Link>
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
              "mobile-sidebar-drawer absolute top-0 left-0 h-full w-[280px] bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] p-6 flex flex-col justify-between shadow-2xl overflow-y-auto",
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
            {children}
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
  const { setOpen, animate } = useSidebar();

  const iconWithColor = React.cloneElement(link.icon as React.ReactElement, {
    className: cn(
      (link.icon as React.ReactElement)?.props?.className,
      isActive
        ? "text-[var(--agora-blue)]"
        : "text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] group-hover/sidebar:text-black dark:group-hover/sidebar:text-white"
    ),
  });

  const showLabel = true;

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-between gap-2 group/sidebar py-2 px-3 rounded-lg transition-all relative sidebar-link-item",
        isActive
          ? "text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-surface)] sidebar-link-active"
          : "text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-surface)] hover:shadow-sm border border-transparent sidebar-link-inactive",
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      <div className="flex items-center gap-2">
        {iconWithColor}
        <span
          className={cn(
            "group-hover/sidebar:translate-x-1 transition duration-150 inline-block",
            isActive ? "text-[var(--agora-blue)]" : " text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)]",
            !showLabel && "opacity-0 w-0 overflow-hidden"
          )}
          style={{ fontSize: 'var(--text-body)' }}
        >
          {link.label}
        </span>
        {link.badge != null && link.badge !== '' && Number(link.badge) !== 0 && (
          <span className="ml-0.5 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full bg-[var(--agora-blue)] px-1.5 text-[10px] font-semibold text-white tabular-nums">
            {typeof link.badge === 'number' && link.badge > 99 ? '99+' : link.badge}
          </span>
        )}
      </div>
      {isActive && (
        <span
          className={cn(
            "text-[var(--agora-blue)] inline-block transition-all duration-200",
            !showLabel && "opacity-0 w-0 overflow-hidden"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </Link>
  );
};
