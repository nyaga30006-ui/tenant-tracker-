import { useAppData } from "../store/AppDataProvider";

export function useTenantResidencies() {
  const { saveTenantMoveIn, saveTenantMoveOut, setTenantResidencies, tenantResidencies } = useAppData();
  return { saveTenantMoveIn, saveTenantMoveOut, setTenantResidencies, tenantResidencies };
}
