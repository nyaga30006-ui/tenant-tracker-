import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usesFirebaseBackend } from "../config/dataBackend";
import { demoProperties } from "../data/demo";
import { createVacantRooms } from "../features/rooms/roomFactory";
import { useFirebaseSession } from "../firebase/FirebaseSessionContext";
import { LOCAL_DATABASE_VERSION, LOCAL_PORTFOLIO_KEY, loadLocalPortfolio, saveLocalPortfolio, type LocalPortfolio } from "../repositories/localStorageRepository";
import { propertyRepository } from "../repositories/propertyRepository";
import type { Property } from "../types/domain";

export type NewProperty = Pick<Property, "name" | "address" | "city" | "units" | "monthlyRentTarget" | "billingResetDay" | "preferredPaymentMethod">;

interface PropertyContextValue {
  addProperty: (property: NewProperty) => Promise<Property>;
  properties: Property[];
  selectedProperty: Property;
  selectProperty: (propertyId: string) => void;
  updateProperty: (property: Property) => Promise<void>;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

function LocalPropertyProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<LocalPortfolio>(loadLocalPortfolio);
  const selectedProperty = portfolio.properties.find((property) => property.id === portfolio.selectedPropertyId) ?? portfolio.properties[0] ?? demoProperties[0];

  useEffect(() => {
    try {
      saveLocalPortfolio(portfolio);
    } catch (error) {
      console.error("The local property portfolio could not be saved.", error);
    }
  }, [portfolio]);

  useEffect(() => {
    function syncPortfolio(event: StorageEvent) {
      if (event.key === LOCAL_PORTFOLIO_KEY && event.newValue) setPortfolio(loadLocalPortfolio());
    }
    window.addEventListener("storage", syncPortfolio);
    return () => window.removeEventListener("storage", syncPortfolio);
  }, []);

  const value = useMemo<PropertyContextValue>(() => ({
    properties: portfolio.properties,
    selectedProperty,
    selectProperty: (propertyId) => setPortfolio((current) => current.properties.some((property) => property.id === propertyId) ? { ...current, selectedPropertyId: propertyId } : current),
    addProperty: async (newProperty) => {
      const property: Property = {
        ...newProperty,
        id: crypto.randomUUID(),
        landlordId: "admin-1",
        occupiedUnits: 0,
        maintenanceUnits: 0,
        collectedThisMonth: 0,
      };
      setPortfolio((current) => ({
        properties: [...current.properties, property],
        selectedPropertyId: property.id,
        version: LOCAL_DATABASE_VERSION,
      }));
      return property;
    },
    updateProperty: async (property) => setPortfolio((current) => ({ ...current, properties: current.properties.map((item) => item.id === property.id ? property : item) })),
  }), [portfolio.properties, selectedProperty]);

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

const emptyFirebaseProperty: Property = {
  address: "",
  billingResetDay: 10,
  city: "",
  collectedThisMonth: 0,
  id: "pending-property",
  landlordId: "",
  maintenanceUnits: 0,
  monthlyRentTarget: 0,
  name: "No property selected",
  occupiedUnits: 0,
  preferredPaymentMethod: "mpesa",
  units: 0,
};

function FirebasePropertyProvider({ children }: { children: ReactNode }) {
  const { profile } = useFirebaseSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  useEffect(() => {
    if (!profile) return;
    return propertyRepository.subscribeForUser(profile, (nextProperties) => {
      setProperties(nextProperties);
      setSelectedPropertyId((current) => nextProperties.some((property) => property.id === current) ? current : nextProperties[0]?.id ?? "");
    }, (error) => console.error("Firebase properties could not be loaded.", error));
  }, [profile]);

  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) ?? properties[0] ?? emptyFirebaseProperty;
  const value = useMemo<PropertyContextValue>(() => ({
    properties,
    selectedProperty,
    selectProperty: (propertyId) => setSelectedPropertyId((current) => properties.some((property) => property.id === propertyId) ? propertyId : current),
    addProperty: async (newProperty) => {
      if (!profile || profile.role !== "admin") throw new Error("Only an administrator can add a Firebase property.");
      const property: Property = {
        ...newProperty,
        collectedThisMonth: 0,
        id: crypto.randomUUID(),
        landlordId: profile.id,
        maintenanceUnits: 0,
        occupiedUnits: 0,
      };
      await propertyRepository.create(property, createVacantRooms(property.units));
      setProperties((current) => current.some((item) => item.id === property.id) ? current : [...current, property]);
      setSelectedPropertyId(property.id);
      return property;
    },
    updateProperty: async (property) => {
      await propertyRepository.save(property);
      setProperties((current) => current.map((item) => item.id === property.id ? property : item));
    },
  }), [profile, properties, selectedProperty]);

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function PropertyProvider({ children }: { children: ReactNode }) {
  return usesFirebaseBackend()
    ? <FirebasePropertyProvider>{children}</FirebasePropertyProvider>
    : <LocalPropertyProvider>{children}</LocalPropertyProvider>;
}

export function useProperties() {
  const context = useContext(PropertyContext);
  if (!context) throw new Error("useProperties must be used inside PropertyProvider.");
  return context;
}
