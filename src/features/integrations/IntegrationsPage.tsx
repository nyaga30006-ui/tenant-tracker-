import { StatusBadge } from "../../components/ui/StatusBadge";

export function IntegrationsPage() {
  return (
    <section className="feature-page legacy-feature-page integrations-page">
      <header className="legacy-page-header page-header"><div><h1>Integrations</h1><p>Credentials will be stored in the backend, never in the browser.</p></div></header>
      <div className="integration-grid">
        <article className="panel settings-section integration-card integration-card--mpesa"><div className="integration-card__brand"><span>M</span><div><h2>M-Pesa Daraja</h2><p>STK Push and Paybill callbacks</p></div></div><StatusBadge tone="warning">Not connected</StatusBadge><ul><li>Automatic payment confirmation</li><li>Transaction reference matching</li><li>Sandbox before production</li></ul><button className="button button--secondary btn btn-ghost" disabled type="button">Connect in backend milestone</button></article>
        <article className="panel settings-section integration-card integration-card--kcb"><div className="integration-card__brand"><span>K</span><div><h2>KCB Buni</h2><p>Bank payment notifications</p></div></div><StatusBadge tone="warning">Not connected</StatusBadge><ul><li>OAuth token handling</li><li>Instant payment notifications</li><li>Automatic reconciliation</li></ul><button className="button button--secondary btn btn-ghost" disabled type="button">Connect in backend milestone</button></article>
      </div>
      <aside className="security-note info-box"><strong>Why this is separate</strong><p>The browser can display payment status, but only secure server functions should hold API secrets or accept payment callbacks.</p></aside>
    </section>
  );
}
