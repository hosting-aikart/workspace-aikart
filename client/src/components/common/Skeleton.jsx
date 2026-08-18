import React from 'react';

export function SkeletonText({ width = '100%', height = '1rem', className = '', style = {} }) {
  return <div className={`skeleton skeleton-text ${className}`} style={{ width, height, ...style }} />;
}

export function SkeletonAvatar({ size = '40px', className = '', style = {} }) {
  return <div className={`skeleton skeleton-avatar ${className}`} style={{ width: size, height: size, borderRadius: '50%', ...style }} />;
}

export function SkeletonCard({ className = '', style = {}, children }) {
  if (children) {
    return (
      <div className={`card skeleton-card ${className}`} style={{ padding: '1.25rem', ...style }}>
        {children}
      </div>
    );
  }
  return (
    <div className={`card skeleton-card ${className}`} style={{ padding: '1.25rem', ...style }}>
      <SkeletonText width="60%" height="1.2rem" style={{ marginBottom: '1rem' }} />
      <SkeletonText width="100%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />
      <SkeletonText width="80%" height="0.875rem" style={{ marginBottom: '0.5rem' }} />
      <SkeletonText width="90%" height="0.875rem" />
    </div>
  );
}

export function SkeletonList({ count = 3, className = '', style = {} }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`} style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4" style={{ padding: '1rem' }}>
          <SkeletonAvatar size="40px" />
          <div style={{ flex: 1 }}>
            <SkeletonText width="40%" height="1rem" style={{ marginBottom: '0.4rem' }} />
            <SkeletonText width="60%" height="0.8rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '', style = {} }) {
  return (
    <div className={`card ${className}`} style={{ overflow: 'hidden', ...style }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonText key={`th-${i}`} width="70%" height="1rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonText key={`td-${r}-${c}`} width={c === 0 ? '50%' : '80%'} height="0.875rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
      <div>
        <SkeletonText width="250px" height="1.8rem" style={{ marginBottom: '0.5rem' }} />
        <SkeletonText width="350px" height="1rem" />
      </div>
      <SkeletonText width="120px" height="36px" style={{ borderRadius: '6px' }} />
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div className="dashboard-root" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <aside style={{ width: '250px', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <SkeletonText width="150px" height="2rem" />
        <SkeletonList count={5} />
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '64px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1.5rem' }}>
          <SkeletonAvatar size="36px" />
        </header>
        {/* Same 1.5rem (24px) as the sidebar's own padding and as the real
            .page-content wrapper this skeleton stands in for — it used to be
            2rem here, the same left/right-bigger-than-top/bottom mismatch
            .page-content itself had, so the gap visibly changed size the
            instant the real page finished loading in underneath it. */}
        <div style={{ padding: '1.5rem', flex: 1, background: 'var(--color-bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard style={{ height: '400px' }} />
        </div>
      </main>
    </div>
  );
}
