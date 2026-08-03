export default function SearchBar({ placeholder = 'Search', value, onChange }) {
  return (
    <input
      className="input"
      placeholder={placeholder}
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
