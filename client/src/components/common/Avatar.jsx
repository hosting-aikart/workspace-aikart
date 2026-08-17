/**
 * Avatar
 * Drop-in replacement for the `<div className="avatar avatar-sm">{getInitials(name)}</div>`
 * pattern copy-pasted across the app — shows the person's uploaded profile
 * photo when they have one, falling back to initials otherwise. Centralizing
 * this in one place means "does this user have a photo?" only has to be
 * answered correctly once (see profilePhoto being the actual field name,
 * not profilePhotoUrl — several call sites had drifted onto that wrong name
 * and silently always showed initials).
 *
 * Usage: <Avatar name={user.name} photo={user.profilePhoto} size="sm" />
 * `size` matches the existing .avatar-xs/sm/lg/xl/2xl modifiers; omit for
 * the default 40px size. Any extra className/style is passed through.
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, photo, size, className = '', style, ...rest }) {
  const classes = ['avatar', size ? `avatar-${size}` : '', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...rest}>
      {photo ? (
        <img src={photo} alt={name || ''} className="avatar-photo" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
