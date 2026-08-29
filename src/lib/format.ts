export function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Current";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function humanizeState(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatMonth(month: string, style: "short" | "long" = "short"): string {
  const [year, index] = month.split("-");
  const label = new Intl.DateTimeFormat("en-IN", { month: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(year), Number(index) - 1, 1)));
  return `${label} ${year}`;
}

/** Currency without the symbol, for dense ledger columns that carry it in the header. */
export function formatAmount(paise: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(paise / 100);
}
