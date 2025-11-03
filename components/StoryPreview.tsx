import React from 'react';
import { Storybook } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { RestartIcon, LightbulbIcon } from './Icons';

type TextOnlyStorybook = Omit<Storybook, 'pages' | 'cover'> & { 
  cover: Omit<Storybook['cover'], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>, 
  pages: Array<Omit<Storybook['pages'][0], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>> 
};

interface StoryPreviewProps {
  story: TextOnlyStorybook;
  onConfirm: () => void;
  onCancel: () => void;
  isGeneratingImages: boolean;
}

const StoryPreview: React.FC<StoryPreviewProps> = ({ story, onConfirm, onCancel, isGeneratingImages }) => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-sky-400 mb-2">Revisão do Editor</h1>
        <p className="text-center text-gray-400 mb-8">Aqui está o rascunho da sua história. Leia e, se gostar, podemos criar as ilustrações!</p>
        
        <div className="bg-gray-900 p-6 rounded-lg max-h-[50vh] overflow-y-auto space-y-6">
            {/* Cover Preview */}
            <div className="border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-sky-500">{story.cover.title}</h2>
                <p className="text-lg text-gray-300">por {story.cover.author}</p>
            </div>

            {/* Pages Preview */}
            {story.pages.map(page => (
                <div key={page.pageNumber} className="border-b border-gray-700 pb-4 last:border-b-0">
                    <h3 className="font-semibold text-gray-400 mb-2">Página {page.pageNumber}</h3>
                    <p className="text-gray-300 leading-relaxed">{page.text}</p>
                </div>
            ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
                onClick={onCancel}
                disabled={isGeneratingImages}
                className="flex items-center justify-center gap-2 py-3 px-6 bg-gray-600 hover:bg-gray-700 rounded-md text-lg transition-colors disabled:opacity-50"
            >
                <RestartIcon className="w-6 h-6" />
                <span>Começar de Novo</span>
            </button>
             <button
                onClick={onConfirm}
                disabled={isGeneratingImages}
                className="flex items-center justify-center gap-3 py-3 px-6 bg-sky-600 hover:bg-sky-700 rounded-md text-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isGeneratingImages ? (
                    <>
                        <LoadingSpinner size="6" />
                        <span>Ilustrando...</span>
                    </>
                ) : (
                    <>
                        <LightbulbIcon className="w-6 h-6" />
                        <span>Parece Ótimo, Criar Ilustrações!</span>
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default StoryPreview;
