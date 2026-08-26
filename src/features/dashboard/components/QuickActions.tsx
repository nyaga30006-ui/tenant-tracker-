import { useAppNavigation } from "../../../app/NavigationContext";
import { Icon, type IconName } from "../../../components/ui/Icon";
import type { PageId } from "../../../app/navigation";
import { useAccess } from "../../../app/AccessContext";
import { useWater } from "../../../hooks/useWater";

const actions: Array<{ description: string; icon: IconName; label: string; page: PageId; tone: string }> = [
  { description: "Occupancy and balances", icon: "rooms", label: "Open Rooms", page: "rooms", tone: "orange" },
  { description: "Search rent records", icon: "payments", label: "View Payments", page: "payments", tone: "green" },
  { description: "Meters and water bills", icon: "water", label: "Manage Water", page: "water", tone: "blue" },
  { description: "Track repair work", icon: "maintenance", label: "Maintenance", page: "maintenance", tone: "coral" },
];

export function QuickActions() {
  const { navigate } = useAppNavigation();
  const { canViewPage } = useAccess();
  const { waterConfiguration } = useWater();
  const visibleActions = actions.filter((action) => canViewPage(action.page) && (action.page !== "water" || waterConfiguration));

  return (
    <section className="dashboard-quick-actions" aria-labelledby="dashboard-quick-actions-title">
      <h2 className="dashboard-section-label" id="dashboard-quick-actions-title">Quick Actions</h2>
      <div className="quick-grid">
        {visibleActions.map((action) => (
          <button className={`quick-card quick-card--${action.tone}`} key={action.page} onClick={() => navigate(action.page)} type="button">
            <div className="qc-icon"><Icon name={action.icon} size={23} /></div>
            <div className="qc-label">{action.label}</div>
            <div className="qc-sub">{action.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
