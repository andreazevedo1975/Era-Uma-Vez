import React, { useState } from 'react';
import { StoryFormData } from '../types';
import { GENRES, TONES, AUDIENCES, ART_STYLES } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { 
    MagicWandIcon, BookOpenIcon, PencilIcon, LightbulbIcon,
    TheaterIcon, SlidersIcon, UsersIcon, PaletteIcon, UserCircleIcon, MountainIcon, GitBranchIcon, HashIcon
} from './Icons';
import { Logo } from './Logo';

interface StoryFormProps {
  onSubmit: (formData: StoryFormData) => void;
  isGenerating: boolean;
}

type TabName = 'genre' | 'tone' | 'audience' | 'style';

const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isGenerating }) => {
  const [formData, setFormData] = useState<StoryFormData>({
    title: "A Aventura do Coelho Curioso",
    genre: GENRES[0],
    tone: TONES[0],
    characters: "Um coelho jovem e curioso chamado Léo e uma coruja sábia chamada Professora Hoot",
    setting: "Uma floresta mágica e vibrante cheia de árvores falantes e riachos cintilantes",
    plot: "Léo, o coelho, encontra um mapa misterioso e decide seguir em uma grande aventura para encontrar o lendário Morango Dourado.",
    numPages: 1,
    audience: AUDIENCES[0],
    style: ART_STYLES[0],
    author: "Gênio Criativo",
    extra: "Certifique-se de que a história tenha uma moral sobre a bravura e a curiosidade.",
  });
  const [activeTab, setActiveTab] = useState<TabName>('genre');

  const TABS: { id: TabName; label: string; icon: React.ReactNode; options: readonly string[] }[] = [
    { id: 'genre', label: 'Gênero', icon: <TheaterIcon className="w-5 h-5" />, options: GENRES },
    { id: 'tone', label: 'Tom', icon: <SlidersIcon className="w-5 h-5" />, options: TONES },
    { id: 'audience', label: 'Público', icon: <UsersIcon className="w-5 h-5" />, options: AUDIENCES },
    { id: 'style', label: 'Estilo de Arte', icon: <PaletteIcon className="w-5 h-5" />, options: ART_STYLES },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'numPages' ? parseInt(value, 10) : value }));
  };

  const handleOptionClick = (name: keyof StoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderInput = (name: keyof StoryFormData, label: string, icon: React.ReactNode, type = 'text') => (
     <div>
      <label htmlFor={name} className="flex items-center gap-2 text-base font-semibold text-slate-100 mb-2">
        {icon}
        <span>{label}</span>
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] as string}
        onChange={handleInputChange}
        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
        {...(type === 'number' && { min: '1', max: '25' })}
      />
    </div>
  );

   const renderTextarea = (name: keyof StoryFormData, label: string, icon: React.ReactNode, rows = 3) => (
    <div className="md:col-span-2">
      <label htmlFor={name} className="flex items-center gap-2 text-base font-semibold text-slate-100 mb-2">
        {icon}
        <span>{label}</span>
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={formData[name] as string}
        onChange={handleInputChange}
        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
      />
    </div>
  );
  
  const activeTabData = TABS.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 animate-fade-in">
      <div className="glass-card p-8">
        <div className="flex flex-col items-center mb-8">
            <Logo className="w-40 h-auto" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-center text-gradient -mt-4">Era Uma Vez!</h1>
            <p className="text-center text-slate-400 mt-2 text-lg">Dê vida à sua imaginação com o poder da IA generativa.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {renderInput('title', 'Título da História', <BookOpenIcon className="w-5 h-5 text-teal-400" />)}
          {renderInput('author', 'Nome do Autor', <PencilIcon className="w-5 h-5 text-teal-400" />)}
          
          <div className="md:col-span-2">
            <div className="flex border-b border-slate-700">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 sm:px-6 text-sm sm:text-base font-semibold transition-colors duration-300 border-b-2 -mb-px
                    ${activeTab === tab.id
                      ? 'border-teal-400 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="w-full bg-slate-800/50 border border-t-0 border-slate-700 rounded-b-lg p-4 min-h-[150px]">
              <div key={activeTab} className="flex flex-wrap gap-2 animate-fade-in">
                {activeTabData?.options.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionClick(activeTabData.id, option)}
                    className={`py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400
                      ${formData[activeTabData.id] === option
                        ? 'bg-gradient-to-r from-teal-500 to-sky-600 text-white shadow-lg'
                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80'
                      }`
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {renderTextarea('characters', 'Personagens Principais', <UserCircleIcon className="w-5 h-5 text-teal-400" />)}
          {renderTextarea('setting', 'Cenário', <MountainIcon className="w-5 h-5 text-teal-400" />)}
          {renderTextarea('plot', 'Enredo Principal', <GitBranchIcon className="w-5 h-5 text-teal-400" />, 4)}
          {renderTextarea('extra', 'Instruções Adicionais (Opcional)', <LightbulbIcon className="w-5 h-5 text-teal-400" />)}
          
          {renderInput('numPages', 'Número de Páginas (1-25)', <HashIcon className="w-5 h-5 text-teal-400" />, 'number')}

          <div className="md:col-span-2 mt-6">
             <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-gradient-to-r from-teal-500 to-fuchsia-600 hover:from-teal-600 hover:to-fuchsia-700 rounded-lg text-xl text-white font-bold shadow-lg transition-transform transform hover:scale-105 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isGenerating ? (
                    <>
                        <LoadingSpinner size="6" />
                        <span>Escrevendo sua história...</span>
                    </>
                ) : (
                    <>
                        <MagicWandIcon className="w-7 h-7" />
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