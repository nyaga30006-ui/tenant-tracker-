import { createContext, useContext, type ReactNode } from "react";
import type { PageId } from "./navigation";

interface NavigationContextValue {
  activePage: PageId;
  navigate: (page: PageId) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ activePage, children, navigate }: NavigationContextValue & { children: ReactNode }) {
  return <NavigationContext.Provider value={{ activePage, navigate }}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useAppNavigation must be used inside NavigationProvider.");
  return context;
}
