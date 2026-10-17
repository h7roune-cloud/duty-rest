// Android hardware back button: go back inside the app instead of closing it.
// Active handlers form a stack — the most recently registered one wins, so an
// open dialog is closed before the search field, the search field before the
// current tab, and quitting is only the last resort.
import { useEffect, useRef } from "react";

type BackHandler = () => boolean;

const stack: BackHandler[] = [];
let installed = false;

/** Adds a handler to the top of the stack. Returns a function that removes it. */
export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.indexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Hooks the native back button once. Does nothing in a plain browser. */
export async function installBackButton(): Promise<void> {
  if (installed) return;
  installed = true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", () => {
      if (!pressBack()) void App.exitApp();
    });
  } catch {
    /* plugin unavailable (plain browser) — nothing to hook */
  }
}

/**
 * One back press: the topmost active handler consumes it. Returns false when
 * there is nothing left to go back to, so the caller can close the app.
 */
export function pressBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      if (stack[i]()) return true;
    } catch {
      /* a broken handler must never block navigation */
    }
  }
  return false;
}

/** Closes the app (used when there is nothing left to go back to). */
export async function quitApp(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {
    /* not native — ignore */
  }
}

/**
 * While `active` is true, a back press calls `onBack` and is consumed.
 * Register low-priority handlers first, high-priority ones last.
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const cb = useRef(onBack);
  useEffect(() => {
    cb.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(() => {
      cb.current();
      return true;
    });
  }, [active]);
}
