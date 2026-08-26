interface StatusBadgeProps {
  children: string;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

