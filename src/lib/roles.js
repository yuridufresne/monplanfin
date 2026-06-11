// Roles management module
// Define and manage user roles and permissions

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
};

export const PERMISSIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE_USERS: 'manage_users'
};

export const rolePermissions = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE,
    PERMISSIONS.READ,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE,
    PERMISSIONS.MANAGE_USERS
  ],
  [ROLES.USER]: [
    PERMISSIONS.CREATE,
    PERMISSIONS.READ,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE
  ],
  [ROLES.GUEST]: [
    PERMISSIONS.READ
  ]
};

export function hasPermission(role, permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasRole(userRole, requiredRole) {
  return userRole === requiredRole;
}
