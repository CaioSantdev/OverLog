import { SET_TYPES, SET_TYPE_INITIALS, type PlannedSet } from '../types/workout';

type SetType = PlannedSet['set_type'];

export function SetTypeBadge({ value }: { value: SetType }) {
  return <span className={`set-type-badge set-type--${value}`} aria-label={SET_TYPES[value]}>{SET_TYPE_INITIALS[value]}</span>;
}

export function SetTypeSelect({ value, onChange, label = 'Tipo de série' }: { value: SetType; onChange: (value: SetType) => void; label?: string }) {
  return <span className="set-type-control">
    <select className="set-type-native" aria-label={label} value={value} onChange={event => onChange(event.target.value as SetType)}>
      {Object.entries(SET_TYPES).map(([type, name]) => <option key={type} value={type} className={`set-type--${type}`}>{name}</option>)}
    </select>
    <span className={`set-type-badge set-type--${value}`} aria-hidden="true">{SET_TYPE_INITIALS[value]}</span>
    <span className="set-type-chevron" aria-hidden="true">⌄</span>
  </span>;
}
