export const roles = {
  PLAYER: "player",
  CREATOR: "creator",
  ADMIN: "admin"
};

const roleHierarchy = {
  [roles.PLAYER]: 1,
  [roles.CREATOR]: 2,
  [roles.ADMIN]: 3
};

export function normalizeRole(role) {
  const normalized = String(role || roles.PLAYER).toLowerCase();
  return roleHierarchy[normalized] ? normalized : roles.PLAYER;
}

export function roleAtLeast(actualRole, requiredRole) {
  const actual = roleHierarchy[normalizeRole(actualRole)] || 0;
  const required = roleHierarchy[normalizeRole(requiredRole)] || roleHierarchy[roles.PLAYER];
  return actual >= required;
}
