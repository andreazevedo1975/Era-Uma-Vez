import React, { useState } from 'react';
import { StoryFormData } from '../types';
import { GENRES, TONES, AUDIENCES, ART_STYLES } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { MagicWandIcon } from './Icons';

interface StoryFormProps {
  onSubmit: (formData: StoryFormData) => void;
  isGenerating: boolean;
}

const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isGenerating }) => {
  const [formData, setFormData] = useState<StoryFormData>({
    title: "A Aventura do Coelho Curioso",
    genre: GENRES[0],
    tone: TONES[0],
    characters: "Um coelho jovem e curioso chamado Léo e uma coruja sábia chamada Professora Hoot",
    setting: "Uma floresta mágica e vibrante cheia de árvores falantes e riachos cintilantes",
    plot: "Léo, o coelho, encontra um mapa misterioso e decide seguir em uma grande aventura para encontrar o lendário Morango Dourado.",
    numPages: 5,
    audience: AUDIENCES[0],
    style: ART_STYLES[0],
    author: "Gênio Criativo",
    extra: "Certifique-se de que a história tenha uma moral sobre a bravura e a curiosidade.",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'numPages' ? parseInt(value, 10) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderSelect = (name: keyof StoryFormData, label: string, options: readonly string[]) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <select
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );

  const renderInput = (name: keyof StoryFormData, label: string, type = 'text') => (
     <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        {...(type === 'number' && { min: '1', max: '10' })}
      />
    </div>
  );

   const renderTextarea = (name: keyof StoryFormData, label: string, rows = 3) => (
    <div className="md:col-span-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={formData[name] as string}
        onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-sky-400 mb-2">Era Uma Vez!</h1>
        <p className="text-center text-gray-400 mb-8">Dê vida à sua imaginação com o poder da IA generativa.</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderInput('title', 'Título da História')}
          {renderInput('author', 'Nome do Autor')}
          {renderSelect('genre', 'Gênero', GENRES)}
          {renderSelect('tone', 'Tom', TONES)}
          {renderSelect('audience', 'Público', AUDIENCES)}
          {renderSelect('style', 'Estilo de Arte', ART_STYLES)}
          {renderTextarea('characters', 'Personagens Principais')}
          {renderTextarea('setting', 'Cenário')}
          {renderTextarea('plot', 'Enredo Principal', 4)}
          {renderTextarea('extra', 'Instruções Adicionais (Opcional)')}
          {renderInput('numPages', 'Número de Páginas (1-10)', 'number')}

          <div className="md:col-span-2 mt-4">
             <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-sky-600 hover:bg-sky-700 rounded-md text-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <LoadingSpinner size="6" />
                        <span>Escrevendo sua história...</span>
                    </>
                ) : (
                    <>
                        <MagicWandIcon className="w-6 h-6" />
                        <span>Criar História</span>
                    </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryForm;