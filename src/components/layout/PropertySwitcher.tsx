import { useProperties } from "../../hooks/useProperties";
import { useAccess } from "../../app/AccessContext";
import { Icon } from "../ui/Icon";

interface PropertySwitcherProps {
  isOpen: boolean;
  onAddProperty: () => void;
  onToggle: () => void;
}

export function PropertySwitcher({ isOpen, onAddProperty, onToggle }: PropertySwitcherProps) {
  const { selectedProperty, selectProperty } = useProperties();
  const { accessibleProperties: properties, permissions } = useAccess();

  function chooseProperty(propertyId: string) {
    selectProperty(propertyId);
    onToggle();
  }

  return (
    <div className="premium-property-switcher">
      <button aria-expanded={isOpen} aria-haspopup="listbox" className="premium-property-picker filter-sel" onClick={onToggle} type="button">
        <span className="bicon"><Icon name="building" size={18} /></span>
        <span className="premium-property-picker__copy"><small>Current property</small><strong>{selectedProperty.name}</strong></span>
        <Icon name="arrow" size={15} />
      </button>
      {isOpen && (
        <section className="premium-property-menu settings-section">
          <header><div><small>Your portfolio</small><strong>{properties.length} properties</strong></div></header>
          <div className="premium-property-list" role="listbox">
            {properties.map((property) => (
              <button aria-selected={selectedProperty.id === property.id} className={`premium-property-option${selectedProperty.id === property.id ? " is-selected" : ""}`} key={property.id} onClick={() => chooseProperty(property.id)} role="option" type="button">
                <span className="bicon"><Icon name="building" size={18} /></span>
                <span className="premium-property-option__copy"><strong>{property.name}</strong><small>{property.city} · {property.units} units</small></span>
                {selectedProperty.id === property.id && <Icon name="check" size={17} />}
              </button>
            ))}
          </div>
          {permissions.canAddProperties && <button className="premium-property-add btn btn-primary" onClick={onAddProperty} type="button"><Icon name="plus" /><span className="premium-property-add__copy"><strong>Add a property</strong><small>Create another property workspace</small></span></button>}
        </section>
      )}
    </div>
  );
}
