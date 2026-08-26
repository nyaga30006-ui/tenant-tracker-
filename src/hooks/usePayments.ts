import { useAppData } from "../store/AppDataProvider";

export function usePayments() {
  const { payments, recordPayment, setPayments } = useAppData();
  return { payments, recordPayment, setPayments };
}
