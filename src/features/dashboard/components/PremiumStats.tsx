import { useAppMetrics } from "../../../app/useAppMetrics";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { formatCurrency } from "../../../lib/format";

export function PremiumStats() {
  const { collected, occupiedCount, pending, rate, totalRooms, vacantCount } = useAppMetrics();
  const stats: Array<{ icon: IconName; label: string; value: string; note: React.ReactNode }> = [
    { icon: "rooms", label: "Total Rooms", value: String(totalRooms), note: <><b>{occupiedCount} occupied</b><span>·</span><em>{vacantCount} vacant</em></> },
    { icon: "payments", label: "This Month Collected", value: formatCurrency(collected), note: <><b>Live room balances</b></> },
    { icon: "bell", label: "This Month Pending", value: formatCurrency(pending), note: <><em>Current rent balance</em></> },
    { icon: "dashboard", label: "Collection Rate", value: `${rate}%`, note: <><b>{rate >= 80 ? "On track" : "Follow up balances"}</b></> },
  ];

  return (
    <section className="stats-grid" aria-label="Property summary">
      {stats.map((stat, index) => (
        <article className={`stat-card stat-card--${index + 1}`} key={stat.label}>
          <div className="sc-label">{stat.label}</div>
          <div className="sc-value">{stat.value}</div>
          <div className="sc-sub">{stat.note}</div>
          <div className="sc-icon" aria-hidden="true"><Icon name={stat.icon} size={25} /></div>
        </article>
      ))}
    </section>
  );
}
