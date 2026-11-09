import type { StaffRole } from '@rt/contracts';
export type Permission = 'catalog' | 'quotes' | 'settings';
export function permits(role: StaffRole, permission: Permission) {
  return role === 'admin' || (role === 'editor' && permission === 'catalog') ||
    (role === 'sales' && permission === 'quotes');
}
export const roleNames: Record<StaffRole,string> = {admin:'Admin',editor:'Editör',sales:'Satış'};
