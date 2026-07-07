"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { HEADER_NAV_MENUS } from "@/lib/header-nav";
import { cn } from "@/lib/utils";

/** 네비↔패널 이동 시 짧은 유예 */
const CLOSE_DELAY_MS = 65;
/** 메뉴 밖으로 나갈 때 */
const CLOSE_OUTSIDE_MS = 28;

type HeaderNavMenuProps = {
  headerRef: React.RefObject<HTMLElement | null>;
};

function isInMenuZone(
  node: Node | null,
  navZone: HTMLElement | null,
  overlay: HTMLElement | null,
) {
  if (!node) return false;
  return navZone?.contains(node) === true || overlay?.contains(node) === true;
}

/** 호버 시 반투명 배경 + 4열 메가 메뉴 */
export function HeaderNavMenu({ headerRef }: HeaderNavMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [overlayTop, setOverlayTop] = useState(0);
  const [panelOffset, setPanelOffset] = useState(0);
  const navZoneRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    cancelClose();
    setOpen(false);
    setActiveLabel(null);
  }, [cancelClose]);

  const openMenu = (label: string) => {
    cancelClose();
    setActiveLabel(label);
    setOpen(true);
  };

  const tryClose = useCallback(
    (delayMs: number) => {
      cancelClose();
      closeTimerRef.current = setTimeout(() => {
        const underPointer = document.elementFromPoint(
          pointerRef.current.x,
          pointerRef.current.y,
        );
        if (isInMenuZone(underPointer, navZoneRef.current, overlayRef.current)) return;
        closeMenu();
      }, delayMs);
    },
    [cancelClose, closeMenu],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      const next = e.relatedTarget;
      if (next instanceof Node && isInMenuZone(next, navZoneRef.current, overlayRef.current)) {
        return;
      }
      const delay = next === null ? CLOSE_DELAY_MS : CLOSE_OUTSIDE_MS;
      tryClose(delay);
    },
    [tryClose],
  );

  const updateLayout = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;

    const headerRect = header.getBoundingClientRect();
    // 헤더 아래부터만 딤 처리 (헤더는 z-50, 오버레이는 z-40)
    setOverlayTop(headerRect.bottom);
    setPanelOffset(8);
  }, [headerRef]);

  useEffect(() => {
    if (!open) return;

    updateLayout();

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLayout = () => updateLayout();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateLayout]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <>
      <div
        ref={navZoneRef}
        className="relative py-1"
        onMouseEnter={cancelClose}
        onMouseLeave={handleMouseLeave}
      >
        <nav className="flex items-center gap-8 xl:gap-10" aria-label="주요 메뉴">
          {HEADER_NAV_MENUS.map((menu) => (
            <button
              key={menu.label}
              type="button"
              aria-expanded={open && activeLabel === menu.label}
              onMouseEnter={() => openMenu(menu.label)}
              onFocus={() => openMenu(menu.label)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm transition-all",
                open && activeLabel === menu.label
                  ? "bg-accent/15 font-semibold text-accent shadow-sm ring-2 ring-accent/40"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {menu.label}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
                  open && activeLabel === menu.label && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          ))}
        </nav>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={overlayRef}
              className="fixed inset-x-0 bottom-0 z-40"
              style={{ top: overlayTop }}
              onMouseEnter={cancelClose}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default bg-background/50"
                aria-label="메뉴 닫기"
                onClick={closeMenu}
              />

              <div
                id="header-nav-mega-panel"
                role="region"
                aria-label="전체 메뉴"
                className="pointer-events-auto relative z-10 border border-border/80 border-t-0 bg-card shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] ring-1 ring-border/50"
                style={{ marginTop: panelOffset }}
              >
                <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-8 md:grid-cols-4 md:gap-x-8 lg:gap-x-12">
                    {HEADER_NAV_MENUS.map((menu) => (
                      <section
                        key={menu.label}
                        className={cn(
                          "min-w-[10.5rem] rounded-xl border-2 border-transparent px-3 py-3 transition-all duration-150",
                          activeLabel === menu.label &&
                            "border-accent/40 bg-accent/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
                        )}
                        onMouseEnter={() => {
                          cancelClose();
                          setActiveLabel(menu.label);
                        }}
                      >
                        <Link
                          href={menu.href}
                          onClick={closeMenu}
                          className={cn(
                            "mb-3 block rounded-md px-2 py-1.5 text-[0.9375rem] font-semibold leading-snug transition-colors",
                            activeLabel === menu.label
                              ? "text-accent"
                              : "text-foreground hover:bg-accent/10 hover:text-accent",
                          )}
                        >
                          {menu.label}
                        </Link>
                        <ul className="space-y-0.5">
                          {menu.items.map((item) => (
                            <li key={`${menu.label}-${item.href}-${item.label}`}>
                              <Link
                                href={item.href}
                                onClick={closeMenu}
                                target={item.external ? "_blank" : undefined}
                                rel={item.external ? "noopener noreferrer" : undefined}
                                className={cn(
                                  "block rounded-lg border border-transparent px-3 py-2.5 transition-all duration-150",
                                  "hover:border-accent/35 hover:bg-accent/18 hover:shadow-sm",
                                  "hover:[&_span:first-child]:text-accent",
                                  "focus-visible:border-accent/40 focus-visible:bg-accent/18 focus-visible:outline-none",
                                )}
                              >
                                <span className="block text-sm font-medium leading-snug text-foreground">
                                  {item.label}
                                </span>
                                {item.description ? (
                                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                    {item.description}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
