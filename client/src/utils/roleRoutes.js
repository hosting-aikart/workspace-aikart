export function getDefaultRouteByRole(role) {
  const normalizedRole = String(role || '').toUpperCase();

  switch (normalizedRole) {
    case 'ADMIN':
      return '/admin';
    case 'MANAGER':
      return '/reports';
    case 'EMPLOYEE':
    default:
      return '/';
  }
}

export function isAllowedRole(role, allowedRoles = []) {
  if (!allowedRoles?.length) {
    return true;
  }

  const normalizedRole = String(role || '').toUpperCase();
  return allowedRoles.some(
    (candidate) => candidate.toUpperCase() === normalizedRole,
  );
}
