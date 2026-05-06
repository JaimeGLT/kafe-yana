import React from 'react';

interface OverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ children, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
  >
    {children}
  </div>
);
