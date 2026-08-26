import { useAppNavigation } from "../../../app/NavigationContext";
import { Icon } from "../../../components/ui/Icon";
import { usePayments } from "../../../hooks/usePayments";
import { useRooms } from "../../../hooks/useRooms";
import { formatCurrency } from "../../../lib/format";

const methodLabels = { bank: "KCB Bank", cash: "Cash", mpesa: "M-Pesa" };

export function RecentPayments() {
  const { navigate } = useAppNavigation();
  const { payments } = usePayments();
  const { rooms } = useRooms();
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 4);

  return (
    <article className="card dashboard-recent-payments">
      <header className="card-heading">
        <div className="card-title">Recent Payments</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("payments")} type="button">View All <Icon name="arrow" size={14} /></button>
      </header>
      <div className="recent-payment-list">
        {recentPayments.map((payment) => {
          const receivedAt = new Date(payment.receivedAt);
          const room = rooms.find((item) => item.id === payment.roomId);
          return (
            <div className="recent-pay-row" key={payment.id}>
              <div className="rpr-info">
                <div className="rpr-main"><strong>{room?.number ?? "Former room"}</strong> · {payment.tenant}</div>
                <div className="rpr-meta">{receivedAt.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {methodLabels[payment.method]}{payment.corrected ? " · Corrected" : ""}</div>
              </div>
              <div className="rpr-amount">+{formatCurrency(payment.amount)}</div>
            </div>
          );
        })}
        {!recentPayments.length && <p className="dashboard-empty">No payments recorded yet.</p>}
      </div>
      <footer className="card-footer">Showing {recentPayments.length} of {payments.length} payments</footer>
    </article>
  );
}
