import { useEffect, useRef, useState, type ReactNode } from "react";
import { navigationItems, type PageId } from "../../app/navigation";
import { useTheme } from "../../app/ThemeContext";
import { AddPropertyDialog } from "../../features/properties/AddPropertyDialog";
import { WaterSetupDialog } from "../../features/water/WaterSetupDialog";
import { useProperties } from "../../hooks/useProperties";
import { useWater } from "../../hooks/useWater";
import { useAppData } from "../../store/AppDataProvider";
import { useAccess } from "../../app/AccessContext";
import { useFirebaseSession } from "../../firebase/FirebaseSessionContext";
import type { Property } from "../../types/domain";
import { BrandMark } from "../ui/BrandMark";
import { Icon } from "../ui/Icon";
import { NotificationsPanel } from "./NotificationsPanel";
import { PropertySwitcher } from "./PropertySwitcher";

interface AppShellProps {
  activePage: PageId;
  children: ReactNode;
  onNavigate: (page: PageId) => void;
}

export function AppShell({ activePage, children, onNavigate }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { selectedProperty } = useProperties();
  const { isWaterConfigurationLoading, setWaterConfiguration, waterConfiguration } = useWater();
  const { provisionProperty, storageError, storageMode, users } = useAppData();
  const { canViewPage, currentUser, permissions, switchUser } = useAccess();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isWaterSetupOpen, setIsWaterSetupOpen] = useState(false);
  const [toast, setToast] = useState("");
  const mobileMorePanelRef = useRef<HTMLDivElement>(null);
  const mobileMoreTriggerRef = useRef<HTMLButtonElement>(null);
  const waterNavigationAvailable = Boolean(waterConfiguration) || (activePage === "water" && isWaterConfigurationLoading);
  const visibleNavigationItems = navigationItems.filter((item) => canViewPage(item.id) && (item.id !== "water" || waterNavigationAvailable));
  const preferredMobilePages: PageId[] = ["dashboard", "rooms", "payments", "water"];
  const preferredMobileItems = preferredMobilePages.flatMap((page) => visibleNavigationItems.filter((item) => item.id === page));
  const mobileItemCandidates = [...preferredMobileItems, ...visibleNavigationItems.filter((item) => !preferredMobilePages.includes(item.id))];
  const primaryMobileItems = mobileItemCandidates.slice(0, 4);
  const primaryMobileItemIds = new Set(primaryMobileItems.map((item) => item.id));
  const moreMobileItems = visibleNavigationItems.filter((item) => !primaryMobileItemIds.has(item.id));
  const hasMoreMobileOptions = moreMobileItems.length > 0 || (!isWaterConfigurationLoading && !waterConfiguration && permissions.canConfigureWater);
  const storageTitle = storageMode === "firebase"
    ? "Cloud connected · Firebase workspace active"
    : "Local test mode · Data stays in this browser";

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (activePage === "water" && !isWaterConfigurationLoading && !waterConfiguration) onNavigate("dashboard");
  }, [activePage, isWaterConfigurationLoading, onNavigate, waterConfiguration]);

  useEffect(() => {
    if (!isAccountOpen && !isNotificationsOpen && !isPropertyMenuOpen) return;
    function dismissMenus(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && event.target instanceof Element) {
        if (isAccountOpen && event.target.closest(".premium-account-switcher")) return;
        if (isNotificationsOpen && event.target.closest(".premium-notifications")) return;
        if (isPropertyMenuOpen && event.target.closest(".premium-property-switcher")) return;
      }
      setIsAccountOpen(false);
      setIsNotificationsOpen(false);
      setIsPropertyMenuOpen(false);
    }
    document.addEventListener("keydown", dismissMenus);
    document.addEventListener("pointerdown", dismissMenus);
    return () => {
      document.removeEventListener("keydown", dismissMenus);
      document.removeEventListener("pointerdown", dismissMenus);
    };
  }, [isAccountOpen, isNotificationsOpen, isPropertyMenuOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const focusFrame = window.requestAnimationFrame(() => mobileMorePanelRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    function closeMore(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && event.target instanceof Element && (mobileMorePanelRef.current?.contains(event.target) || mobileMoreTriggerRef.current?.contains(event.target))) return;
      setIsMoreOpen(false);
    }
    document.addEventListener("keydown", closeMore);
    document.addEventListener("pointerdown", closeMore);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeMore);
      document.removeEventListener("pointerdown", closeMore);
    };
  }, [isMoreOpen]);

  function navigate(page: PageId) {
    onNavigate(page);
    setIsMoreOpen(false);
  }

  function openAddProperty() {
    if (!permissions.canAddProperties) return;
    setIsPropertyMenuOpen(false);
    setIsAddPropertyOpen(true);
  }

  function finishAddingProperty(property: Property) {
    provisionProperty(property.id, property.units);
    setIsAddPropertyOpen(false);
    setToast(`${property.name} was added with ${property.units} editable rooms.`);
  }

  function openWaterSetup() {
    if (!permissions.canConfigureWater) return;
    setIsMoreOpen(false);
    setIsWaterSetupOpen(true);
  }

  return (
    <div className="premium-shell live-shell">
      <aside aria-label="Desktop navigation" className="premium-sidebar live-top-navigation">
        <nav className="premium-nav" aria-label="Main navigation">
          {visibleNavigationItems.map((item) => (
            <button aria-current={activePage === item.id ? "page" : undefined} className={`premium-nav__item premium-nav__item--${item.id}${activePage === item.id ? " is-active" : ""}`} key={item.id} onClick={() => navigate(item.id)} type="button">
              <span className="bicon"><Icon name={item.id} size={18} /></span><span>{item.label}</span>
            </button>
          ))}
          {!isWaterConfigurationLoading && !waterConfiguration && permissions.canConfigureWater && <button className="premium-nav__item premium-nav__item--setup" onClick={openWaterSetup} type="button"><span className="bicon"><Icon name="water" size={18} /></span><span>Add Water Feature</span></button>}
        </nav>
      </aside>

      <div className="premium-workspace live-workspace">
        <header className="premium-topbar live-header">
          <div className="premium-topbar__left">
            <div className="mobile-premium-brand live-header-brand">
              <span className="header-logo"><BrandMark /></span>
              <strong>MyProperty</strong>
              <span aria-label={storageTitle} className={`live-sync-status live-sync-status--${storageMode}`} role="status" title={storageTitle}><span className="sync-dot" /><span className="visually-hidden">{storageTitle}</span></span>
            </div>
            <PropertySwitcher isOpen={isPropertyMenuOpen} onAddProperty={openAddProperty} onToggle={() => { setIsPropertyMenuOpen((open) => !open); setIsNotificationsOpen(false); setIsAccountOpen(false); }} />
          </div>
          <div className="premium-account">
            <button aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`} type="button"><Icon name={theme === "light" ? "moon" : "sun"} /></button>
            <NotificationsPanel isOpen={isNotificationsOpen} onToggle={() => { setIsNotificationsOpen((open) => !open); setIsPropertyMenuOpen(false); setIsAccountOpen(false); }} />
            <div className="premium-account-switcher">
              <button aria-expanded={isAccountOpen} aria-label={`Welcome, ${currentUser.username}. Open account menu`} className="premium-account-identity live-user-chip" onClick={() => { setIsAccountOpen((open) => !open); setIsNotificationsOpen(false); setIsPropertyMenuOpen(false); }} type="button"><span className="role-chip-hdr">{currentUser.role.toUpperCase()}</span><strong>{currentUser.username}</strong><Icon name="arrow" size={15} /></button>
              {isAccountOpen && <section className="premium-account-menu">{storageMode === "local" ? <><header><small>Local role preview</small><strong>Switch active user</strong></header>{users.filter((user) => !user.disabled).map((user) => <button className={user.id === currentUser.id ? "is-active" : ""} key={user.id} onClick={() => { switchUser(user.id); setIsAccountOpen(false); }} type="button"><span>{user.username.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{user.username}</strong><small>{user.role === "admin" ? "Administrator" : user.role === "caretaker" ? "Caretaker" : user.landlordAccess === "full" ? "Landlord · Full" : "Landlord · View"}</small></div>{user.id === currentUser.id && <Icon name="check" size={15} />}</button>)}</> : <FirebaseAccountMenu onSignedOut={() => setIsAccountOpen(false)} />}</section>}
            </div>
          </div>
        </header>
        <main className="premium-main">{children}</main>
        <footer className="app-footer live-app-footer">Made by <span>Ian Murimi Nyaga</span> · Nyaga Property Management</footer>
      </div>

      {isMoreOpen && hasMoreMobileOptions && (
        <nav aria-label="More navigation options" className="premium-mobile-more" ref={mobileMorePanelRef}>
          {moreMobileItems.map((item) => (
            <button className={`premium-mobile-more__item premium-mobile-more__item--${item.id}`} key={item.id} onClick={() => navigate(item.id)} type="button"><span className="bicon"><Icon name={item.id} size={18} /></span><div><strong>{item.label}</strong><small>Open {item.label.toLowerCase()}</small></div><Icon name="arrow" size={15} /></button>
          ))}
          {!isWaterConfigurationLoading && !waterConfiguration && permissions.canConfigureWater && <button onClick={openWaterSetup} type="button"><span className="bicon"><Icon name="water" size={18} /></span><div><strong>Add Water Feature</strong><small>Choose sell-water or buy-water tracking</small></div><Icon name="arrow" size={15} /></button>}
        </nav>
      )}

      <nav className="premium-mobile-nav" aria-label="Mobile navigation">
        {primaryMobileItems.map((item) => (
          <button aria-current={activePage === item.id ? "page" : undefined} className={`premium-mobile-nav__item premium-mobile-nav__item--${item.id}${activePage === item.id ? " is-active" : ""}`} key={item.id} onClick={() => navigate(item.id)} type="button"><Icon name={item.id} size={20} /><small>{item.shortLabel}</small></button>
        ))}
        {hasMoreMobileOptions && <button aria-expanded={isMoreOpen} className={moreMobileItems.some((item) => item.id === activePage) || isMoreOpen ? "is-active" : ""} onClick={() => setIsMoreOpen((open) => !open)} ref={mobileMoreTriggerRef} type="button"><Icon name="more" size={20} /><small>More</small></button>}
      </nav>

      {isAddPropertyOpen && permissions.canAddProperties && <AddPropertyDialog onAdded={finishAddingProperty} onClose={() => setIsAddPropertyOpen(false)} />}
      {isWaterSetupOpen && permissions.canConfigureWater && <WaterSetupDialog onClose={() => setIsWaterSetupOpen(false)} onSaved={(configuration) => { setWaterConfiguration(configuration); setIsWaterSetupOpen(false); onNavigate("water"); setToast("Water was added to this property."); }} propertyName={selectedProperty.name} />}
      {storageError && <div aria-live="assertive" className="app-storage-error" role="alert"><Icon name="warning" size={18} /><span><strong>Changes not saved</strong>{storageError}</span></div>}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </div>
  );
}

function FirebaseAccountMenu({ onSignedOut }: { onSignedOut: () => void }) {
  const { authUser, signOut } = useFirebaseSession();
  return <><header><small>Firebase Authentication</small><strong>{authUser?.email ?? "Signed in securely"}</strong></header><button onClick={() => { void signOut().then(onSignedOut); }} type="button"><span><Icon name="security" size={16} /></span><div><strong>Sign out</strong><small>End this Firebase session</small></div></button></>;
}
