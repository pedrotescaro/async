export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="site-brand">
      <img src="/async-logo-dark.svg" alt="" aria-hidden="true" />
      {!compact && <span>ASYNC</span>}
    </span>
  );
}
