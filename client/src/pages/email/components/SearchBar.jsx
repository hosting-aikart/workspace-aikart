import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SearchBar
 *
 * Debounced search input. Calls onSearch(query) after 400 ms of inactivity.
 * Shows a clear button when there is text.
 */
export default function SearchBar({ onSearch, initialValue = '' }) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef(null);

  const handleChange = useCallback((e) => {
    const q = e.target.value;
    setValue(q);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(q);
    }, 400);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  }, [onSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch(value);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="email-search-bar">
      <span className="email-search-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        id="email-search-input"
        type="text"
        className="email-search-input"
        placeholder="Search emails..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Search emails"
      />
      {value && (
        <button
          className="email-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
