import { PremiumCollection } from "./components/PremiumCollection";
import { PremiumStats } from "./components/PremiumStats";
import { RecentPayments } from "./components/RecentPayments";
import { RoomStatus } from "./components/RoomStatus";
import { OperationalOverview } from "./components/OperationalOverview";
import { LifetimeCollection } from "./components/LifetimeCollection";
import { CollectionAlerts } from "./components/CollectionAlerts";
import { QuickActions } from "./components/QuickActions";

export function DashboardPage() {
  const today = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <section className="page dashboard-page premium-dashboard">
      <header className="page-header dashboard-page-header">
        <h1 className="page-title">Dashboard</h1>
        <span className="dashboard-date">{today}</span>
      </header>

      <PremiumCollection />
      <CollectionAlerts />
      <QuickActions />

      <section className="two-grid dashboard-summary-grid">
        <RoomStatus />
        <RecentPayments />
      </section>

      <PremiumStats />
      <OperationalOverview />
      <LifetimeCollection />
    </section>
  );
}
