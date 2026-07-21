export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return <span className={`badge ${normalized}`}>{status}</span>;
}
