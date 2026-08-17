import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * MessageContextMenu
 * The WhatsApp-style menu that opens on right-clicking a message bubble (or
 * tapping its hover-revealed "⋯" button, for touch devices that have no
 * right-click). Rendered at a fixed viewport position — `anchor` is the
 * click/tap coordinates — and nudged back on-screen if it would otherwise
 * overflow the window edge.
 */
export default function MessageContextMenu({ anchor, message, isOwn, onClose, onCopy, onForward, onDelete, onSelect }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(anchor);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let { x, y } = anchor;
    if (x + rect.width + margin > window.innerWidth) x = window.innerWidth - rect.width - margin;
    if (y + rect.height + margin > window.innerHeight) y = window.innerHeight - rect.height - margin;
    setPosition({ x: Math.max(margin, x), y: Math.max(margin, y) });
  }, [anchor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    // A right-click anywhere else while this menu is open should reposition
    // it there, not stack another one on top — closing is the simplest way
    // to let the row's own onContextMenu handler open a fresh one if needed.
    document.addEventListener('contextmenu', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  const item = (action, label, icon, danger = false) => (
    <button
      className={`chat-thread-menu-item ${danger ? 'chat-thread-menu-item-danger' : ''}`}
      onClick={() => {
        onClose();
        action();
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="chat-message-menu"
      style={{ left: position.x, top: position.y }}
    >
      {message.content &&
        item(onCopy, 'Copy', (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        ))}
      {item(onForward, 'Forward', (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />
        </svg>
      ))}
      {item(onSelect, 'Select', (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ))}
      {isOwn &&
        item(onDelete, 'Delete', (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        ), true)}
    </div>
  );
}
