export const ADMIN_ROLE = 'admin';
export const STAFF_ROLE = 'staff';
export const TEST_USER_ROLE = 'test';
export const ORDER_PICKER_ROLE = 'order_picker';

export const VALID_USER_ROLES = [ADMIN_ROLE, STAFF_ROLE, TEST_USER_ROLE, ORDER_PICKER_ROLE] as const;

export function isStaffLikeRole(role: string | null | undefined) {
  return role === STAFF_ROLE || role === TEST_USER_ROLE;
}

export function isOrderPickerRole(role: string | null | undefined) {
  return role === ORDER_PICKER_ROLE;
}

export function isRestrictedSessionRole(role: string | null | undefined) {
  return isStaffLikeRole(role) || isOrderPickerRole(role);
}

export function isTestUserRole(role: string | null | undefined) {
  return role === TEST_USER_ROLE;
}

export function getRoleLabel(role: string) {
  if (role === ADMIN_ROLE) return 'Admin';
  if (role === STAFF_ROLE) return 'Staff';
  if (role === TEST_USER_ROLE) return 'Test User';
  if (role === ORDER_PICKER_ROLE) return 'Order Picker';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
