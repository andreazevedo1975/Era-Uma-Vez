import React, { useState, useEffect, useRef } from 'react';
import { Storybook, ImageForEditing, StoryPage, StoryCover } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, RestartIcon, PencilIcon, VolumeUpIcon, DownloadIcon, BookOpenIcon } from './Icons';
import PdfLayoutModal from './PdfLayoutModal';

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


interface StorybookViewerProps {
  storybook: Storybook;
  onRestart: () => void;
  onEditImage: (image: ImageForEditing) => void;
  onGenerateSpeech: (text: string) => Promise<string | null>;
}

// FIX: Replaced buggy playAudio function with a correct implementation using the Web Audio API.
const playAudio = async (base64Audio: string, onEnded: () => void): Promise<(() => void) | null> => {
    let audioContext: AudioContext | null = null;
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            audioContext,
            24000,
            1,
        );
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        
        const contextForCleanup = audioContext;
        source.onended = () => {
            onEnded();
            contextForCleanup.close();
        };

        return () => {
            source.stop();
        };

    } catch (e) {
        console.error("Failed to play audio:", e);
        alert("Failed to play audio.");
        if (audioContext) {
            audioContext.close();
        }
        return null;
    }
};

const StorybookViewer: React.FC<StorybookViewerProps> = ({ storybook, onRestart, onEditImage, onGenerateSpeech }) => {
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); // 0 is cover
    const [isNarrating, setIsNarrating] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
    const stopNarrationRef = useRef<(() => void) | null>(null);

    const totalPages = storybook.pages.length + 1; // +1 for cover
    const isCover = currentPageIndex === 0;
    const isLastPage = currentPageIndex === totalPages - 1;

    const currentContent: StoryPage | StoryCover = isCover ? storybook.cover : storybook.pages[currentPageIndex - 1];

    useEffect(() => {
        // Stop narration when changing pages
        return () => {
            if (stopNarrationRef.current) {
                stopNarrationRef.current();
                stopNarrationRef.current = null;
                setIsNarrating(false);
            }
        };
    }, [currentPageIndex]);


    const handlePrev = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
        }
    };

    const handleNext = () => {
        if (!isLastPage) {
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
    
    // FIX: Refactored narration logic to work with the new async playAudio function.
    const handleNarrateClick = async () => {
        if (isNarrating && stopNarrationRef.current) {
            stopNarrationRef.current();
            // onended callback will handle state changes
            return;
        }

        const textToNarrate = isCover ? `Title: ${storybook.cover.title}. By ${storybook.cover.author}` : storybook.pages[currentPageIndex - 1].text;
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

    const renderPageContent = () => {
        const { imageUrl, isGeneratingImage } = currentContent;

        return (
            <div className="relative w-full aspect-[4/3] bg-gray-700 rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
                {isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <LoadingSpinner size="12" />
                        <span>Ilustrando...</span>
                    </div>
                ) : imageUrl ? (
                     <img src={imageUrl} alt={isCover ? storybook.cover.title : `Page ${currentPageIndex}`} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-400 p-4">
                        <p>Falha ao gerar a imagem.</p>
                        <p>Tente editar para criar uma nova.</p>
                    </div>
                )}
                 <button 
                    onClick={handleEditClick} 
                    className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isGeneratingImage || !imageUrl}
                    aria-label="Editar imagem"
                    title="Editar Imagem"
                >
                    <PencilIcon className="w-6 h-6" />
                </button>
            </div>
        );
    };

    const renderTextContent = () => {
        if (isCover) {
            return (
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-sky-400">{storybook.cover.title}</h1>
                    <p className="text-xl text-gray-300 mt-2">por {storybook.cover.author}</p>
                </div>
            );
        }
        const page = storybook.pages[currentPageIndex - 1];
        return (
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">{page.text}</p>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in">
            <header className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-8 h-8 text-sky-400" />
                    <h1 className="text-2xl font-bold text-white">{storybook.cover.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                     <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="flex items-center gap-2 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                        title="Baixar como PDF"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Baixar PDF</span>
                    </button>
                    <button
                        onClick={onRestart}
                        className="flex items-center gap-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                        title="Começar de Novo"
                    >
                        <RestartIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Começar de Novo</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Image Side */}
                <div className="flex flex-col items-center">
                   {renderPageContent()}
                </div>

                {/* Text Side */}
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg h-full flex flex-col justify-between min-h-[300px] lg:min-h-0">
                    <div className="flex-grow overflow-y-auto">
                        {renderTextContent()}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                         <button
                            onClick={handleNarrateClick}
                            className="flex items-center gap-2 py-2 px-4 bg-sky-600 hover:bg-sky-700 rounded-md transition-colors disabled:bg-gray-500"
                            disabled={!currentContent}
                        >
                            <VolumeUpIcon className="w-6 h-6" />
                            <span>{isNarrating ? 'Parar' : 'Narrar'}</span>
                        </button>
                         <div className="text-gray-400 font-semibold">
                           {isCover ? "Capa" : `Página ${currentPageIndex} de ${totalPages - 1}`}
                        </div>
                    </div>
                </div>
            </div>

             {/* Navigation */}
            <footer className="mt-6 flex justify-center items-center gap-4">
                 <button
                    onClick={handlePrev}
                    disabled={currentPageIndex === 0}
                    className="p-3 bg-gray-700 rounded-full hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior"
                >
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
                 <span className="text-lg font-semibold">{currentPageIndex + 1} / {totalPages}</span>
                <button
                    onClick={handleNext}
                    disabled={isLastPage}
                    className="p-3 bg-gray-700 rounded-full hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Próxima página"
                >
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            </footer>

            {isPdfModalOpen && (
                <PdfLayoutModal 
                    storybook={storybook}
                    onClose={() => setIsPdfModalOpen(false)}
                />
            )}
        </div>
    );
};

export default StorybookViewer;
