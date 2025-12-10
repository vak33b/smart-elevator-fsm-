// src/utils/formatDate.ts
export function formatDateTime(value: string | number | Date | undefined | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "—";
  }
}
