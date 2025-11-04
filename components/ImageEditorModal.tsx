import React, { useState, useEffect } from 'react';
import { ImageForEditing } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { CloseIcon, MagicWandIcon } from './Icons';

interface ImageEditorModalProps {
  imageForEditing: ImageForEditing | null;
  onClose: () => void;
  onEdit: (prompt: string) => void;
  isEditing: boolean;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageForEditing, onClose, onEdit, isEditing }) => {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (imageForEditing) {
      setPrompt(''); // Reset prompt when a new image is selected
    }
  }, [imageForEditing]);

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onEdit(prompt);
    }
  };
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  }

  if (!imageForEditing) {
    return null;
  }

  return (
    <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={handleOverlayClick}
    >
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-zoom-in">
        <div className="w-full md:w-1/2 p-4 flex items-center justify-center bg-black/20">
             <img src={imageForEditing.imageUrl} alt="Imagem para editar" className="max-w-full max-h-[80vh] object-contain rounded-md shadow-2xl" />
        </div>
        <div className="w-full md:w-1/2 p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-bold text-gradient font-display">Editar Imagem</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                  <CloseIcon className="w-7 h-7" />
              </button>
          </div>
          <p className="text-slate-300 mb-4">
            Descreva as alterações que você gostaria de fazer. Por exemplo, "adicione um chapéu de sol no coelho" ou "mude o céu para o anoitecer".
          </p>
          <form onSubmit={handleEdit} className="flex-grow flex flex-col">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sua instrução de edição aqui..."
              className="w-full flex-grow bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-shadow"
              disabled={isEditing}
            />
            <div className="mt-6">
                <button
                    type="submit"
                    disabled={isEditing || !prompt.trim()}
                    className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-gradient-to-r from-teal-500 to-fuchsia-600 hover:from-teal-600 hover:to-fuchsia-700 rounded-lg text-lg text-white font-bold shadow-lg transition-transform transform hover:scale-105 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {isEditing ? (
                        <>
                            <LoadingSpinner size="6" />
                            <span>Editando...</span>
                        </>
                    ) : (
                        <>
                            <MagicWandIcon className="w-6 h-6" />
                            <span>Aplicar Magia</span>
                        </>
                    )}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;