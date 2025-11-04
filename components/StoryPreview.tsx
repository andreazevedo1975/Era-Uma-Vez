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
      <div className="glass-card p-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-center text-gradient mb-2">Revisão do Editor</h1>
        <p className="text-center text-slate-400 mb-8">Aqui está o rascunho da sua história. Leia e, se gostar, podemos criar as ilustrações!</p>
        
        <div className="bg-slate-900/70 p-6 rounded-lg max-h-[50vh] overflow-y-auto space-y-6 border border-slate-700">
            {/* Cover Preview */}
            <div className="border-b border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-teal-400">{story.cover.title}</h2>
                <p className="text-lg text-slate-300">por {story.cover.author}</p>
            </div>

            {/* Pages Preview */}
            {story.pages.map(page => (
                <div key={page.pageNumber} className="border-b border-slate-700 pb-4 last:border-b-0">
                    <h3 className="font-semibold text-slate-400 mb-2">Página {page.pageNumber}</h3>
                    <p className="text-slate-300 leading-relaxed">{page.text}</p>
                </div>
            ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
                onClick={onCancel}
                disabled={isGeneratingImages}
                className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-600 hover:bg-slate-700 rounded-lg text-lg text-white font-semibold shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
                <RestartIcon className="w-6 h-6" />
                <span>Começar de Novo</span>
            </button>
             <button
                onClick={onConfirm}
                disabled={isGeneratingImages}
                className="flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-teal-500 to-fuchsia-600 hover:from-teal-600 hover:to-fuchsia-700 rounded-lg text-lg text-white font-bold shadow-lg transition-transform transform hover:scale-105 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed disabled:scale-100"
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