
/**
 * Role-Based Access Control (RBAC) Logic
 */

export type AdminRole = 'super-admin' | 'admin' | 'content-manager' | 'moderator' | 'support-staff' | 'student';

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

export const ROLE_PERMISSIONS: Record<AdminRole, PermissionSet> = {
  'super-admin': {
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
  'admin': {
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
  'content-manager': {
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
  'moderator': {
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
  'support-staff': {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: true, // View only usually, but for MVP we use module access
    canManageExams: false,
    canManageMocks: false,
    canUploadContent: false,
    canPublishTests: false,
    canViewAnalytics: false,
    canViewReports: true,
  },
  'student': {
    canManageSettings: false,
    canManageAdmins: false,
    canManageUsers: false,
    canManageExams: false,
    canManageMocks: false,
    canUploadContent: false,
    canPublishTests: false,
    canViewAnalytics: false,
    canViewReports: false,
  }
};

export function hasPermission(role: AdminRole, permission: keyof PermissionSet): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] || false;
}

export function isAdmin(role: AdminRole): boolean {
  return ['super-admin', 'admin', 'content-manager', 'moderator', 'support-staff'].includes(role);
}
