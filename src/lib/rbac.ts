/**
 * Role-Based Access Control (RBAC)
 */

export type AdminRole =
  | "super-admin"
  | "admin"
  | "content-manager"
  | "moderator"
  | "support-staff"
  | "student";

export interface PermissionSet {
  canManageSettings: boolean;
  canManageAdmins: boolean;
  canManageUsers: boolean;
  canManageExams: boolean;
  canManageMocks: boolean;
  canUploadContent: boolean;
  canPublishTests: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
}

export const ROLE_PERMISSIONS: Record<
  AdminRole,
  PermissionSet
> = {
  "super-admin": {
    canManageSettings: true,
    canManageAdmins: true,
    canManageUsers: true,
    canManageExams: true,
    canManageMocks: true,
    canUploadContent: true,
    canPublishTests: true,
    canViewAnalytics: true,
    canViewReports: true,
  },

  admin: {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: true,
    canManageExams: true,
    canManageMocks: true,
    canUploadContent: true,
    canPublishTests: true,
    canViewAnalytics: true,
    canViewReports: true,
  },

  "content-manager": {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: false,
    canManageExams: true,
    canManageMocks: true,
    canUploadContent: true,
    canPublishTests: true,
    canViewAnalytics: false,
    canViewReports: false,
  },

  moderator: {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: false,
    canManageExams: false,
    canManageMocks: false,
    canUploadContent: false,
    canPublishTests: false,
    canViewAnalytics: true,
    canViewReports: true,
  },

  "support-staff": {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: true,
    canManageExams: false,
    canManageMocks: false,
    canUploadContent: false,
    canPublishTests: false,
    canViewAnalytics: false,
    canViewReports: true,
  },

  student: {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: false,
    canManageExams: false,
    canManageMocks: false,
    canUploadContent: false,
    canPublishTests: false,
    canViewAnalytics: false,
    canViewReports: false,
  },
};

/**
 * Check permission
 */
export function hasPermission(
  role: string | undefined,
  permission: keyof PermissionSet
): boolean {
  if (!role) return false;

  const normalizedRole =
    role.toLowerCase() as AdminRole;

  return (
    ROLE_PERMISSIONS[normalizedRole]?.[
      permission
    ] || false
  );
}

/**
 * Check admin access
 */
export function isAdmin(
  role: string | undefined
): boolean {
  if (!role) return false;

  const normalizedRole =
    role.toLowerCase().trim();

  console.log(
    "RBAC CHECK ROLE:",
    normalizedRole
  );

  return [
    "super-admin",
    "admin",
    "content-manager",
    "moderator",
    "support-staff",
  ].includes(normalizedRole);
}
