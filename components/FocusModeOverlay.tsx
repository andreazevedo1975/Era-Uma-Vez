import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface FocusModeOverlayProps {
  element: 'image' | 'text';
  content: string;
  title: string;
  onClose: () => void;
}

const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ element, content, title, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative glass-card w-full max-w-5xl max-h-[90vh] flex flex-col p-6 animate-zoom-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the content
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-teal-400">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Fechar modo de foco">
                <CloseIcon className="w-8 h-8" />
            </button>
        </div>
        
        <div className="flex-grow overflow-auto flex items-center justify-center min-h-0">
            {element === 'image' ? (
                <img src={content} alt={title} className="max-w-full max-h-full object-contain rounded-md" />
            ) : (
                <div className="text-slate-200 text-2xl leading-relaxed whitespace-pre-wrap p-4">
                    {content}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FocusModeOverlay;