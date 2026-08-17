import logo from '../../assets/aikart-logo-transparent.png';

const FEATURES = [
  {
    title: 'Real-time Team Chat',
    desc: 'Message any colleague instantly and stay in sync across every project.',
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  },
  {
    title: 'Tasks & Projects',
    desc: 'Track tasks, deadlines and progress without ever leaving your workspace.',
    icon: (
      <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
  {
    title: 'Meetings & Alerts',
    desc: 'Never miss a sync, announcement or update from the rest of your team.',
    icon: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
];

/**
 * Animated hero illustration for the login page's left panel.
 * Pure SVG/CSS — no image assets — so it stays crisp at any size
 * and costs nothing to load.
 */
export default function LoginIllustration() {
  return (
    <div className="login-illustration" aria-hidden="true">
      {/* Layered gradient + blobs */}
      <div className="li-bg" />
      <div className="li-blob li-blob-1" />
      <div className="li-blob li-blob-2" />
      <div className="li-blob li-blob-3" />

      {/* Dot grid texture */}
      <svg className="li-grid" width="100%" height="100%">
        <defs>
          <pattern id="liDots" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.5)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#liDots)" />
      </svg>

      {/* Large faint decorative ring, bottom-left corner */}
      <svg className="li-corner-ring" viewBox="0 0 300 300">
        <circle cx="150" cy="150" r="140" />
        <circle cx="150" cy="150" r="100" />
      </svg>

      {/* Orbit rings + traveling satellites, tucked top-right */}
      <div className="li-orbit-wrap">
        <svg className="li-rings" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="150" className="li-ring li-ring-a" />
          <circle cx="200" cy="200" r="110" className="li-ring li-ring-b" />
          <circle cx="200" cy="200" r="72" className="li-ring li-ring-c" />
        </svg>

        <div className="li-satellite li-satellite-1">
          <span className="li-dot" />
        </div>
        <div className="li-satellite li-satellite-2">
          <span className="li-dot li-dot-alt" />
        </div>
        <div className="li-satellite li-satellite-3">
          <span className="li-dot li-dot-alt2" />
        </div>

        <div className="li-core">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Sparkles, scattered across the whole scene */}
      <span className="li-spark li-spark-1">✦</span>
      <span className="li-spark li-spark-2">✦</span>
      <span className="li-spark li-spark-3">✦</span>
      <span className="li-spark li-spark-4">✦</span>
      <span className="li-spark li-spark-5">✦</span>
      <span className="li-spark li-spark-6">✦</span>
      <span className="li-spark li-spark-7">✦</span>
      <span className="li-spark li-spark-8">✦</span>

      {/* Foreground content — normal flow, never overlaps */}
      <div className="li-content">
        <div className="li-brand">
          <span className="li-brand-badge">
            <img src={logo} alt="AIKart" className="li-brand-logo" />
          </span>
          <span className="li-brand-word">Workspace</span>
        </div>

        <div className="li-main">
          <span className="li-eyebrow">Employee Workspace</span>
          <h2 className="li-headline">
            Where your <span>workspace</span> comes alive.
          </h2>
          <p className="li-sub">
            Chat, tasks, meetings and announcements — everything your team
            needs, in one calm, connected place.
          </p>

          <div className="li-features">
            {FEATURES.map((f) => (
              <div className="li-feature" key={f.title}>
                <span className="li-feature-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {f.icon}
                  </svg>
                </span>
                <span className="li-feature-copy">
                  <span className="li-feature-title">{f.title}</span>
                  <span className="li-feature-desc">{f.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="li-footer">
          © {new Date().getFullYear()} AIKart Workspace. All rights reserved.
        </p>
      </div>
    </div>
  );
}
