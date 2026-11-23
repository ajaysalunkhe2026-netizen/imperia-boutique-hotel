export type DashboardRole = "owner" | "general_manager" | "technical_admin";

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function getDashboardRole(phone: string | null | undefined): DashboardRole | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const raw = process.env.DASHBOARD_ROLE_MAP;
  if (!raw) return null;

  try {
    const roleMap = JSON.parse(raw) as Record<string, unknown>;
    const role = roleMap[normalized];
    return role === "owner" || role === "general_manager" || role === "technical_admin"
      ? role
      : null;
  } catch {
    return null;
  }
}

export function getDashboardRoleLabel(role: DashboardRole): string {
  switch (role) {
    case "owner":
      return "Hotel Owner";
    case "general_manager":
      return "General Manager";
    case "technical_admin":
      return "Technical Admin";
  }
}
