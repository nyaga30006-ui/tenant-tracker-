import { useAppData } from "../store/AppDataProvider";

export function useRooms() {
  const { rooms, setRooms } = useAppData();
  return { rooms, setRooms };
}
