export const ADMIN_ROLE = 'admin';
export const STAFF_ROLE = 'staff';
export const TEST_USER_ROLE = 'test';
export const ORDER_PICKER_ROLE = 'order_picker';
export const DECORATOR_PRINT_ROLE = 'decorator_print';
export const DECORATOR_EMB_ROLE = 'decorator_emb';
export const DECORATOR_SEWER_ROLE = 'decorator_sewer';

export const DECORATOR_ROLES = [DECORATOR_PRINT_ROLE, DECORATOR_EMB_ROLE, DECORATOR_SEWER_ROLE] as const;

export const VALID_USER_ROLES = [
  ADMIN_ROLE,
  STAFF_ROLE,
  TEST_USER_ROLE,
  ORDER_PICKER_ROLE,
  DECORATOR_PRINT_ROLE,
  DECORATOR_EMB_ROLE,
  DECORATOR_SEWER_ROLE,
] as const;

// Decoration categories. Sewer has no auto-category (assignment-only visibility).
export type DecorationCategory = 'embroidery' | 'print';

export function isStaffLikeRole(role: string | null | undefined) {
  return role === STAFF_ROLE || role === TEST_USER_ROLE;
}

export function isOrderPickerRole(role: string | null | undefined) {
  return role === ORDER_PICKER_ROLE;
}
export function isOrderDecoratorRole(role: string | null | undefined) {
  return role === DECORATOR_EMB_ROLE || role === DECORATOR_PRINT_ROLE || role === DECORATOR_SEWER_ROLE;
}

export function isDecoratorRole(role: string | null | undefined) {
  return role === DECORATOR_PRINT_ROLE || role === DECORATOR_EMB_ROLE || role === DECORATOR_SEWER_ROLE;
}

/** The auto-visibility category for a decorator role. Sewer => null (assignment-only). */
export function getDecoratorCategory(role: string | null | undefined): DecorationCategory | null {
  if (role === DECORATOR_EMB_ROLE) return 'embroidery';
  if (role === DECORATOR_PRINT_ROLE) return 'print';
  return null;
}

export function isRestrictedSessionRole(role: string | null | undefined) {
  return isStaffLikeRole(role) || isOrderPickerRole(role) || isDecoratorRole(role);
}

export function isTestUserRole(role: string | null | undefined) {
  return role === TEST_USER_ROLE;
}

export function getRoleLabel(role: string) {
  if (role === ADMIN_ROLE) return 'Admin';
  if (role === STAFF_ROLE) return 'Staff';
  if (role === TEST_USER_ROLE) return 'Test User';
  if (role === ORDER_PICKER_ROLE) return 'Order Picker';
  if (role === DECORATOR_PRINT_ROLE) return 'Decorator - Print';
  if (role === DECORATOR_EMB_ROLE) return 'Decorator - Emb';
  if (role === DECORATOR_SEWER_ROLE) return 'Decorator - Sewer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
