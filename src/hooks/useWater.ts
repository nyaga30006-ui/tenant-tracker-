import { useAppData } from "../store/AppDataProvider";

export function useWater() {
  const {
    isWaterConfigurationLoading,
    setWaterConfiguration,
    setWaterMeterReadings,
    setWaterMeters,
    setWaterPurchaseBills,
    setWaterSales,
    waterConfiguration,
    waterMeterReadings,
    waterMeters,
    waterPurchaseBills,
    waterSales,
  } = useAppData();

  return {
    isWaterConfigurationLoading,
    setWaterConfiguration,
    setWaterMeterReadings,
    setWaterMeters,
    setWaterPurchaseBills,
    setWaterSales,
    waterConfiguration,
    waterMeterReadings,
    waterMeters,
    waterPurchaseBills,
    waterSales,
  };
}
