import { useEffect, useState, type ComponentType } from "react";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ElectricityPage } from "../features/electricity/ElectricityPage";
import { IntegrationsPage } from "../features/integrations/IntegrationsPage";
import { MaintenancePage } from "../features/maintenance/MaintenancePage";
import { PaymentsPage } from "../features/payments/PaymentsPage";
import { RoomsPage } from "../features/rooms/RoomsPage";
import { UsersPage } from "../features/users/UsersPage";
import { WaterPage } from "../features/water/WaterPage";
import type { PageId } from "./navigation";
import { AppDataProvider } from "../store/AppDataProvider";
import { PropertyProvider } from "./PropertyContext";
import { ThemeProvider } from "./ThemeContext";
import { NavigationProvider } from "./NavigationContext";
import { AccessProvider, useAccess } from "./AccessContext";
import { usesFirebaseBackend } from "../config/dataBackend";
import { FirebaseAuthBoundary, FirebaseSessionProvider } from "../firebase/FirebaseSessionContext";

const pages: Record<PageId, ComponentType> = { dashboard: DashboardPage, rooms: RoomsPage, water: WaterPage, payments: PaymentsPage, maintenance: MaintenancePage, electricity: ElectricityPage, users: UsersPage, integrations: IntegrationsPage };

function AuthorizedApp() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const { canViewPage, defaultPage } = useAccess();
  const ActivePage = pages[activePage];

  useEffect(() => {
    if (!canViewPage(activePage)) setActivePage(defaultPage);
  }, [activePage, canViewPage, defaultPage]);

  return (
    <NavigationProvider activePage={activePage} navigate={setActivePage}>
      <AppShell activePage={activePage} onNavigate={(page) => { if (canViewPage(page)) setActivePage(page); }}>
        <ActivePage />
      </AppShell>
    </NavigationProvider>
  );
}

export function App() {
  const application = <PropertyProvider><AppDataProvider><AccessProvider><AuthorizedApp /></AccessProvider></AppDataProvider></PropertyProvider>;
  return <ThemeProvider>{usesFirebaseBackend() ? <FirebaseSessionProvider><FirebaseAuthBoundary>{application}</FirebaseAuthBoundary></FirebaseSessionProvider> : application}</ThemeProvider>;
}
