interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning";
}

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

