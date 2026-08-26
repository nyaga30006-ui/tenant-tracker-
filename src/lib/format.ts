const kenyaCurrency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return kenyaCurrency.format(value);
}

export function formatKes(value: number): string {
  return `KES ${Math.abs(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
