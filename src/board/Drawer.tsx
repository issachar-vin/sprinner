import { useEffect } from 'react';
import type { ReactNode } from 'react';

type DrawerProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Slides in from the left edge. Deliberately not modal — there is no backdrop,
 * so the board stays visible and usable while a ticket is open, and picking a
 * different ticket just swaps the contents.
 */
export function Drawer({ title, onClose, children }: DrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside className="drawer" role="dialog" aria-label={title}>
      <div className="drawer-head">
        <h2>{title}</h2>
        <button type="button" className="drawer-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </aside>
  );
}
