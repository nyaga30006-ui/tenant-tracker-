import { useAppData } from "../store/AppDataProvider";

export function useTenantResidencies() {
  const { setTenantResidencies, tenantResidencies } = useAppData();
  return { setTenantResidencies, tenantResidencies };
}
