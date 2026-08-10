import type { PlatformTenant } from "../../types/platform";

export default function TenantStatusBadge({
  status,
}: {
  status: PlatformTenant["status"];
}) {
  return (
    <span className={`platform-status platform-status-${status}`}>
      <span aria-hidden="true" />
      {status === "active" ? "Aktif" : "Ditangguhkan"}
    </span>
  );
}
