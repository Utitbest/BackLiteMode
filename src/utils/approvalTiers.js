export const APPROVAL_LIMITS = {
  FACILITY_MANAGER: 999,
  OPERATIONS_MANAGER: 999,
  SUPER_ADMIN_2: 1000000,
  SUPER_ADMIN_1: Infinity,
};

export function getRequiredTier(cost) {
  if (cost <= 999) return { label: "Facility Manager", range: "₦0 – ₦999" };
  if (cost <= 1000000) return { label: "Super Admin II", range: "₦1,000 – ₦1,000,000" };
  return { label: "Super Admin I", range: "Above ₦1,000,000" };
}

export function canApprove(role, cost) {
  const limit = APPROVAL_LIMITS[role] ?? -1;
  return cost <= limit;
}