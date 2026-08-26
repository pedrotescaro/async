export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="site-brand">
      <img src="/async-logo-dark.svg" alt="ASYNC Logo" className="brand-logo-img" />
      {!compact && <span>ASYNC</span>}
    </span>
  );
}
