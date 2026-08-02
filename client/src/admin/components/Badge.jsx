export default function Badge({ children, tone = 'primary' }) {
  const toneClass =
    {
      primary: 'badge badge-primary',
      secondary: 'badge badge-secondary',
      success: 'badge badge-success',
      warning: 'badge badge-warning',
      danger: 'badge badge-danger',
      info: 'badge badge-info',
    }[tone] || 'badge badge-primary';

  return <span className={toneClass}>{children}</span>;
}
