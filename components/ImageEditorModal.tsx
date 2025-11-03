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
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/2 p-4 flex items-center justify-center">
             <img src={imageForEditing.imageUrl} alt="Imagem para editar" className="max-w-full max-h-[80vh] object-contain rounded-md" />
        </div>
        <div className="w-full md:w-1/2 p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-sky-400">Editar Imagem</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                  <CloseIcon className="w-6 h-6" />
              </button>
          </div>
          <p className="text-gray-300 mb-4">
            Descreva as alterações que você gostaria de fazer. Por exemplo, "adicione um chapéu de sol no coelho" ou "mude o céu para o anoitecer".
          </p>
          <form onSubmit={handleEdit} className="flex-grow flex flex-col">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sua instrução de edição aqui..."
              className="w-full flex-grow bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              disabled={isEditing}
            />
            <div className="mt-4">
                <button
                    type="submit"
                    disabled={isEditing || !prompt.trim()}
                    className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-sky-600 hover:bg-sky-700 rounded-md text-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
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
