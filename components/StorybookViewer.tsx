import React, { useState, useEffect, useRef } from 'react';
import { Storybook, ImageForEditing, StoryPage, StoryCover } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, RestartIcon, PencilIcon, VolumeUpIcon, DownloadIcon, BookOpenIcon, FocusIcon, FileCodeIcon, ShareIcon, FullscreenIcon, MinimizeIcon, SaveIcon, CloseIcon, HashIcon, RefreshCwIcon, MountainIcon } from './Icons';
import PdfLayoutModal from './PdfLayoutModal';
import FocusModeOverlay from './FocusModeOverlay';

// FIX: Added audio decoding helper functions according to Gemini API guidelines for raw PCM audio data.
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const generateInteractiveHtml = (storybook: Storybook): string => {
    const { cover, pages } = storybook;
  
    const pagesHtml = [cover, ...pages].map((page, index) => {
      const isCover = index === 0;
      const content = isCover
        ? `
          <div class="text-center">
              <h1 class="text-4xl font-bold" style="color: #2dd4bf;">${(page as StoryCover).title}</h1>
              <p class="text-xl text-slate-300 mt-2">por ${(page as StoryCover).author}</p>
          </div>
        `
        : `<p class="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">${(page as StoryPage).text}</p>`;
  
      return `
        <div id="page-${index}" class="page-container hidden w-full">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div class="relative w-full aspect-[4/3] bg-slate-700 rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
              ${page.imageUrl ? `<img src="${page.imageUrl}" class="w-full h-full object-cover">` : '<div class="text-white">A imagem não está disponível</div>'}
            </div>
            <div class="bg-slate-800/50 rounded-lg p-6 shadow-lg h-full flex items-center justify-center min-h-[300px] lg:min-h-0">
              ${content}
            </div>
          </div>
        </div>
      `;
    }).join('');
  
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${cover.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Nunito', sans-serif;
            background: linear-gradient(-45deg, #1f2937, #3730a3, #1e293b, #4a0e91);
            background-size: 400% 400%;
            animation: gradientBG 20s ease infinite;
          }
           @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .page-container {
              animation: fadeIn 0.5s ease-out forwards;
          }
          @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
          }
          .icon {
              width: 2rem;
              height: 2rem;
              stroke: currentColor;
          }
        </style>
      </head>
      <body class="text-white">
        <main class="min-h-screen flex flex-col items-center justify-center p-4">
          <div class="w-full max-w-7xl mx-auto">
            <header class="flex justify-between items-center mb-4">
              <h1 class="text-2xl font-bold" style="color: #2dd4bf;">${cover.title}</h1>
            </header>
            
            <div id="storybook-content" class="relative">
              ${pagesHtml}
            </div>
  
            <footer class="mt-6 flex justify-center items-center gap-4">
              <button id="prev-btn" class="p-3 bg-slate-700 rounded-full hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Página anterior">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span id="page-counter" class="text-lg font-semibold w-48 text-center"></span>
              <button id="next-btn" class="p-3 bg-slate-700 rounded-full hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Próxima página">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </footer>
          </div>
        </main>
  
        <script>
          const pages = document.querySelectorAll('.page-container');
          const prevBtn = document.getElementById('prev-btn');
          const nextBtn = document.getElementById('next-btn');
          const pageCounter = document.getElementById('page-counter');
          const totalPages = pages.length;
          let currentPageIndex = 0;
  
          function showPage(index) {
            pages.forEach((page, i) => {
              page.classList.toggle('hidden', i !== index);
            });
            if (index === 0) {
              pageCounter.textContent = 'Capa';
            } else {
              pageCounter.textContent = \`Página \${index} de \${totalPages - 1}\`;
            }
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === totalPages - 1;
          }
  
          prevBtn.addEventListener('click', () => {
            if (currentPageIndex > 0) {
              currentPageIndex--;
              showPage(currentPageIndex);
            }
          });
  
          nextBtn.addEventListener('click', () => {
            if (currentPageIndex < totalPages - 1) {
              currentPageIndex++;
              showPage(currentPageIndex);
            }
          });
  
          showPage(currentPageIndex);
        </script>
      </body>
      </html>
    `;
};

interface StorybookViewerProps {
  storybook: Storybook;
  onRestart: () => void;
  onEditImage: (image: ImageForEditing) => void;
  onGenerateSpeech: (text: string) => Promise<string | null>;
  onRegenerateImage: (imageInfo: { type: 'cover' | 'page'; index: number }) => void;
}

// BUGFIX: Use a single, shared AudioContext for efficiency and stability.
let audioContext: AudioContext | null = null;
const getAudioContext = () => {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContext;
};

const playAudio = async (base64Audio: string, onEnded: () => void): Promise<(() => void) | null> => {
    try {
        const context = getAudioContext();
        if (context.state === 'suspended') {
            await context.resume();
        }
        
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            context,
            24000,
            1,
        );
        
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start();
        
        source.onended = onEnded;

        return () => {
            try {
              source.stop();
            } catch (e) {
              console.warn("A fonte de áudio não pôde ser interrompida (pode já ter terminado).", e);
            }
        };

    } catch (e) {
        console.error("Falha ao tocar o áudio:", e);
        alert("Falha ao tocar o áudio.");
        return null;
    }
};

interface PageSelectorModalProps {
  storybook: Storybook;
  totalPages: number;
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onClose: () => void;
}

const PageSelectorModal: React.FC<PageSelectorModalProps> = ({
  storybook,
  totalPages,
  currentPageIndex,
  onSelectPage,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col p-6 animate-zoom-in">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gradient font-display">
            <HashIcon className="w-6 h-6" />
            <span>Pular para a Página</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Fechar seletor de página">
            <CloseIcon className="w-8 h-8" />
          </button>
        </div>
        {/* FIX: The map callback was likely structured incorrectly, causing scope issues. Rewriting the block to ensure variables are correctly scoped within the returned JSX. */}
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {Array.from({ length: totalPages }, (_, i) => {
              const isCover = i === 0;
              const pageContent = isCover ? storybook.cover : storybook.pages[i - 1];
              const { imageUrl, isGeneratingImage } = pageContent;

              return (
                 <button
                    key={i}
                    onClick={() => onSelectPage(i)}
                    className={`
                        aspect-square rounded-lg transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 relative overflow-hidden group bg-slate-800
                        ${currentPageIndex === i ? 'ring-4 ring-teal-400' : 'hover:scale-105'}
                    `}
                    aria-label={`Pular para ${isCover ? 'Capa' : `Página ${i}`}`}
                >
                    {isGeneratingImage ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <LoadingSpinner size="4" />
                        </div>
                    ) : imageUrl ? (
                        <img src={imageUrl} alt={isCover ? 'Capa' : `Página ${i}`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2">
                            <MountainIcon className="w-6 h-6" />
                            <span className="text-xs mt-1 font-semibold text-slate-400">{isCover ? 'Capa' : i}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold text-lg">{isCover ? 'Capa' : i}</span>
                    </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// FIX: Changed component signature to be more explicit and avoid type inference issues with React.FC.
export const StorybookViewer = ({ storybook, onRestart, onEditImage, onGenerateSpeech, onRegenerateImage }: StorybookViewerProps): React.ReactElement => {
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
    const [isNarrating, setIsNarrating] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [focusModeElement, setFocusModeElement] = useState<'image' | 'text' | null>(null);
    const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPageSelectorOpen, setIsPageSelectorOpen] = useState(false);
    
    const stopNarrationRef = useRef<(() => void) | null>(null);

    const totalPages = storybook.pages.length + 1;
    const isCover = currentPageIndex === 0;
    const isLastPage = currentPageIndex === totalPages - 1;

    const currentContent: StoryPage | StoryCover = isCover ? storybook.cover : storybook.pages[currentPageIndex - 1];

    useEffect(() => {
        return () => {
            if (stopNarrationRef.current) {
                stopNarrationRef.current();
                stopNarrationRef.current = null;
                setIsNarrating(false);
            }
        };
    }, [currentPageIndex]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
              alert(`Erro ao tentar habilitar o modo de tela cheia: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handlePrev = () => {
        if (currentPageIndex > 0) {
            setTransitionDirection('prev');
            setCurrentPageIndex(currentPageIndex - 1);
        }
    };

    const handleNext = () => {
        if (!isLastPage) {
            setTransitionDirection('next');
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const handleEditClick = () => {
        if (isCover) {
            onEditImage({
                type: 'cover',
                index: 0,
                imageUrl: storybook.cover.imageUrl,
                mimeType: storybook.cover.mimeType || 'image/png'
            });
        } else {
            const page = storybook.pages[currentPageIndex - 1];
            onEditImage({
                type: 'page',
                index: currentPageIndex - 1,
                imageUrl: page.imageUrl,
                mimeType: page.mimeType || 'image/png'
            });
        }
    };
    
    const handleRegenerateClick = () => {
        if (isCover) {
            onRegenerateImage({ type: 'cover', index: 0 });
        } else {
            onRegenerateImage({ type: 'page', index: currentPageIndex - 1 });
        }
    };

    const handleNarrateClick = async () => {
        if (isNarrating && stopNarrationRef.current) {
            stopNarrationRef.current();
            return;
        }

        const textToNarrate = isCover ? `Título: ${storybook.cover.title}. Por ${storybook.cover.author}` : storybook.pages[currentPageIndex - 1].text;
        setIsNarrating(true);
        try {
            const base64Audio = await onGenerateSpeech(textToNarrate);
            if (base64Audio) {
               const stopPlayback = await playAudio(base64Audio, () => {
                    setIsNarrating(false);
                    stopNarrationRef.current = null;
               });
               if (stopPlayback) {
                    stopNarrationRef.current = stopPlayback;
               } else {
                 setIsNarrating(false);
               }
            } else {
                setIsNarrating(false);
            }
        } catch (error) {
            console.error("Narration failed", error);
            setIsNarrating(false);
        }
    };

    const handleDownloadInteractive = () => {
        if (!storybook) return;
        try {
            const htmlContent = generateInteractiveHtml(storybook);
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${storybook.cover.title.replace(/\s/g, '_')}_interactive.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Falha ao criar o download do storybook interativo:", error);
            alert("Ocorreu um erro ao preparar o storybook interativo.");
        }
    };

    const handleShare = async () => {
      if (!storybook) return;
  
      const storyString = JSON.stringify(storybook);
      // BUGFIX: Use a robust method to encode Unicode strings to Base64
      const uint8Array = new TextEncoder().encode(storyString);
      let binaryString = '';
      uint8Array.forEach((byte) => {
          binaryString += String.fromCharCode(byte);
      });
      const base64Story = btoa(binaryString);
      
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('story', base64Story);
      const shareableLink = url.toString();
  
      const shareData = {
          title: `Era Uma Vez: ${storybook.cover.title}`,
          text: `Confira esta história que criei: "${storybook.cover.title}"`,
          url: shareableLink,
      };
  
      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.error("Share failed:", err);
          }
      } else {
          try {
              await navigator.clipboard.writeText(shareableLink);
              setShareStatus('copied');
              setTimeout(() => setShareStatus('idle'), 2000);
          } catch (err) {
              console.error("Failed to copy:", err);
              alert("Falha ao copiar o link. O link é muito longo para a área de transferência.");
          }
      }
    };

    const handleSave = () => {
        try {
            const storyString = JSON.stringify(storybook);
            localStorage.setItem('eraUmaVez_savedStory', storyString);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Falha ao salvar a história no localStorage:", error);
            alert("Não foi possível salvar a história. O armazenamento local pode estar cheio ou indisponível.");
        }
    };

    const renderPageContent = () => {
        const { imageUrl, isGeneratingImage } = currentContent;

        return (
            <div className="relative w-full aspect-[4/3] bg-slate-800 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center border border-slate-700">
                {isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <LoadingSpinner size="12" />
                        <span>Ilustrando...</span>
                    </div>
                ) : imageUrl ? (
                     <img src={imageUrl} alt={isCover ? storybook.cover.title : `Página ${currentPageIndex}`} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-slate-400 p-4">
                        <p>Falha ao gerar a imagem.</p>
                        <p>Tente regenerar para criar uma nova.</p>
                    </div>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        onClick={handleRegenerateClick}
                        className="bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGeneratingImage}
                        aria-label="Regenerar imagem"
                        title="Regenerar Imagem"
                    >
                        <RefreshCwIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setFocusModeElement('image')}
                        className="bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGeneratingImage || !imageUrl}
                        aria-label="Focar na imagem"
                        title="Modo de Foco"
                    >
                        <FocusIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleEditClick}
                        className="bg-black/50 hover:bg-black/75 backdrop-blur-sm text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isGeneratingImage || !imageUrl}
                        aria-label="Editar imagem"
                        title="Editar Imagem"
                    >
                        <PencilIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    };

    const renderTextContent = () => {
        if (isCover) {
            return (
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-teal-400">{storybook.cover.title}</h1>
                    <p className="text-xl text-slate-300 mt-2">por {storybook.cover.author}</p>
                </div>
            );
        }
        const page = storybook.pages[currentPageIndex - 1];
        return (
            <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">{page.text}</p>
        );
    };

    return (
        <div className={`w-full max-w-7xl mx-auto p-4 animate-fade-in ${isFullscreen ? 'h-screen flex flex-col justify-center' : ''}`}>
             <header className={`glass-card flex justify-between items-center mb-6 p-2 ${isFullscreen ? 'hidden' : ''}`}>
                <div className="flex items-center gap-3 pl-2 flex-1 min-w-0">
                    <BookOpenIcon className="w-6 h-6 text-teal-400 flex-shrink-0" />
                    <h1 className="text-lg font-bold text-white truncate" title={storybook.cover.title}>
                        {storybook.cover.title}
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={toggleFullscreen} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-semibold bg-slate-700/60 hover:bg-slate-700/90 text-white" title={isFullscreen ? "Sair do modo de tela cheia" : "Entrar em modo de tela cheia"}>
                        {isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <FullscreenIcon className="w-5 h-5" />}
                        <span>{isFullscreen ? 'Minimizar' : 'Tela Cheia'}</span>
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-semibold bg-slate-700/60 hover:bg-slate-700/90 text-white" title="Compartilhar um link para esta história">
                        <ShareIcon className="w-5 h-5" />
                        <span>{shareStatus === 'copied' ? 'Copiado!' : 'Compartilhar'}</span>
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-semibold bg-slate-700/60 hover:bg-slate-700/90 text-white" title="Salvar esta história em seu navegador para visualizá-la mais tarde">
                        <SaveIcon className="w-5 h-5" />
                        <span>{saveStatus === 'saved' ? 'Salvo!' : 'Salvar'}</span>
                    </button>
                    <button onClick={handleDownloadInteractive} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-semibold bg-slate-700/60 hover:bg-slate-700/90 text-white" title="Baixar um arquivo HTML interativo desta história">
                        <FileCodeIcon className="w-5 h-5" />
                        <span>Interativo</span>
                    </button>
                    <button onClick={() => setIsPdfModalOpen(true)} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-semibold bg-slate-700/60 hover:bg-slate-700/90 text-white" title="Abrir opções para baixar um arquivo PDF da história">
                        <DownloadIcon className="w-5 h-5" />
                        <span>PDF</span>
                    </button>
                    <button onClick={onRestart} className="flex items-center gap-2 py-2 px-3 rounded-lg transition-all text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white transform hover:scale-105" title="Descartar esta história e criar uma nova">
                        <RestartIcon className="w-5 h-5" />
                        <span>Novo</span>
                    </button>
                </div>
            </header>

            <div 
                key={currentPageIndex}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                    transitionDirection === 'next' ? 'animate-page-flip' :
                    transitionDirection === 'prev' ? 'animate-zoom-in-slightly' : ''
                }`}
            >
                <div className="flex flex-col items-center">
                   {renderPageContent()}
                </div>
                <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6 shadow-2xl h-full flex flex-col justify-between min-h-[450px] lg:min-h-0 relative">
                    <button onClick={() => setFocusModeElement('text')} className="absolute top-4 right-4 bg-slate-700/80 hover:bg-slate-600/80 text-white p-2 rounded-full transition-all z-10" aria-label="Focar no texto" title="Modo de Foco">
                        <FocusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-grow overflow-y-auto pr-4">
                        {renderTextContent()}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4">
                         <button onClick={handleNarrateClick} className="flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 rounded-lg text-white font-semibold shadow-lg transition-transform transform hover:scale-105 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed disabled:scale-100" disabled={!currentContent}>
                            <VolumeUpIcon className="w-6 h-6" />
                            <span>{isNarrating ? 'Parar' : 'Narrar'}</span>
                        </button>
                        <button onClick={handleEditClick} className="flex items-center gap-2 py-2 px-4 bg-slate-600/80 hover:bg-slate-500/80 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={currentContent.isGeneratingImage || !currentContent.imageUrl} title="Editar Imagem">
                            <PencilIcon className="w-5 h-5" />
                            <span>Editar Imagem</span>
                        </button>
                    </div>
                </div>
            </div>

            <footer className={`mt-6 flex justify-center items-center gap-4 ${isFullscreen ? 'hidden' : ''}`}>
                 <button onClick={handlePrev} disabled={currentPageIndex === 0} className="p-3 bg-slate-900/40 border-2 border-slate-600/80 rounded-full backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-900/40 disabled:border-slate-600/80 disabled:scale-100 transition-all transform hover:scale-110 hover:bg-teal-500 hover:border-teal-400" aria-label="Página anterior">
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button 
                    onClick={() => setIsPageSelectorOpen(true)}
                    className="text-lg font-semibold w-48 text-center text-slate-300 rounded-lg hover:bg-slate-800/60 transition-colors p-2"
                    title="Pular para a página"
                >
                    {isCover
                        ? 'Capa'
                        : `Página ${currentPageIndex} de ${totalPages - 1}`
                    }
                </button>
                <button onClick={handleNext} disabled={isLastPage} className="p-3 bg-slate-900/40 border-2 border-slate-600/80 rounded-full backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-900/40 disabled:border-slate-600/80 disabled:scale-100 transition-all transform hover:scale-110 hover:bg-teal-500 hover:border-teal-400" aria-label="Próxima página">
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            </footer>

            {isPdfModalOpen && (
                <PdfLayoutModal 
                    storybook={storybook}
                    onClose={() => setIsPdfModalOpen(false)}
                />
            )}

            {focusModeElement && (
                <FocusModeOverlay
                    element={focusModeElement}
                    content={
                        focusModeElement === 'image'
                            ? currentContent.imageUrl
                            : isCover ? '' : (currentContent as StoryPage).text
                    }
                    coverContent={isCover && focusModeElement === 'text' ? storybook.cover : undefined}
                    title={
                        focusModeElement === 'image'
                            ? (isCover ? "Ilustração da Capa" : `Ilustração - Página ${currentPageIndex}`)
                            : (isCover ? "Texto da Capa" : `Texto - Página ${currentPageIndex}`)
                    }
                    onClose={() => setFocusModeElement(null)}
                />
            )}

            {isPageSelectorOpen && (
                <PageSelectorModal
                    storybook={storybook}
                    totalPages={totalPages}
                    currentPageIndex={currentPageIndex}
                    onSelectPage={(index) => {
                        if (index !== currentPageIndex) {
                            setTransitionDirection(null);
                            setCurrentPageIndex(index);
                        }
                        setIsPageSelectorOpen(false);
                    }}
                    onClose={() => setIsPageSelectorOpen(false)}
                />
            )}
        </div>
    );
};