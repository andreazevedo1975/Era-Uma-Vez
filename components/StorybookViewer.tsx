import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Storybook, ImageForEditing, StoryPage } from '../types';
import LoadingSpinner from './LoadingSpinner';
import FocusModeOverlay from './FocusModeOverlay';
import PdfLayoutModal from './PdfLayoutModal';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    RestartIcon,
    PencilIcon,
    VolumeUpIcon,
    FocusIcon,
    DownloadIcon,
    ShareIcon,
    FullscreenIcon,
    MinimizeIcon,
    RefreshCwIcon,
    PauseIcon
} from './Icons';

// Audio decoding utilities (needed for TTS playback)
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
  onRegenerateImage: (imageInfo: { type: 'cover' | 'page'; index: number }) => void;
}

export const StorybookViewer: React.FC<StorybookViewerProps> = ({ storybook, onRestart, onEditImage, onGenerateSpeech, onRegenerateImage }) => {
    // State management
    const [currentPageIndex, setCurrentPageIndex] = useState(-1); // -1 for cover
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [focusElement, setFocusElement] = useState<{ element: 'image' | 'text', content: string, title: string, coverContent?: Storybook['cover'] } | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [isNarrating, setIsNarrating] = useState(false);
    const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle');

    // Refs
    const viewerRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Memos for current page data
    const isCover = currentPageIndex === -1;
    const pageData = isCover ? storybook.cover : storybook.pages[currentPageIndex];
    const totalPages = storybook.pages.length;

    // Effects
    useEffect(() => {
        // Stop audio when page changes
        stopNarration();
    }, [currentPageIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
            if (e.key === 'ArrowLeft') handlePrevPage();
            if (e.key === 'ArrowRight') handleNextPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPageIndex, totalPages]);
    
    useEffect(() => {
        // Save to local storage whenever storybook changes
        if (storybook) {
            try {
                // Check if all images are generated before saving
                const allImagesDone = !storybook.cover.isGeneratingImage && storybook.pages.every(p => !p.isGeneratingImage);
                if (allImagesDone) {
                    localStorage.setItem('eraUmaVez_savedStory', JSON.stringify(storybook));
                }
            } catch (error) {
                console.error("Failed to save story to localStorage:", error);
            }
        }
    }, [storybook]);

    // Handlers
    const handleNextPage = useCallback(() => {
        if (currentPageIndex < totalPages - 1) {
            setCurrentPageIndex(prev => prev + 1);
        }
    }, [currentPageIndex, totalPages]);

    const handlePrevPage = useCallback(() => {
        if (currentPageIndex > -1) {
            setCurrentPageIndex(prev => prev - 1);
        }
    }, [currentPageIndex]);
    
    const stopNarration = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
           audioContextRef.current.close();
           audioContextRef.current = null;
        }
        setIsNarrating(false);
    }, []);

    const handleToggleNarration = async () => {
        if (isNarrating) {
            stopNarration();
            return;
        }

        const textToNarrate = isCover ? `${storybook.cover.title}. por ${storybook.cover.author}` : (pageData as StoryPage).text;
        if (!textToNarrate) return;
        
        setIsGeneratingNarration(true);

        try {
            const base64Audio = await onGenerateSpeech(textToNarrate);
            if (!base64Audio) return;

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioCtx = audioContextRef.current;
            
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
            
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            
            source.onended = () => {
                setIsNarrating(false);
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
                audioContextRef.current = null;
            };

            source.start();
            audioSourceRef.current = source;
            setIsNarrating(true);

        } catch (error) {
            console.error("Error during narration:", error);
            stopNarration();
        } finally {
            setIsGeneratingNarration(false);
        }
    };

    const handleEditClick = () => {
        if (!pageData.imageUrl || pageData.isGeneratingImage) return;

        onEditImage({
            type: isCover ? 'cover' : 'page',
            index: currentPageIndex,
            imageUrl: pageData.imageUrl,
            mimeType: pageData.mimeType || 'image/png'
        });
    };

    const handleRegenerateClick = () => {
        onRegenerateImage({
            type: isCover ? 'cover' : 'page',
            index: currentPageIndex
        });
    };

    const handleFocusClick = (element: 'image' | 'text') => {
        if (element === 'image' && pageData.imageUrl && !pageData.isGeneratingImage) {
            setFocusElement({
                element: 'image',
                content: pageData.imageUrl,
                title: isCover ? storybook.cover.title : `Página ${currentPageIndex + 1}`
            });
        } else if (element === 'text') {
            const textContent = isCover ? '' : (pageData as StoryPage).text;
            setFocusElement({
                element: 'text',
                content: textContent,
                title: isCover ? storybook.cover.title : `Página ${currentPageIndex + 1}`,
                coverContent: isCover ? storybook.cover : undefined,
            });
        }
    };

    const handleShare = () => {
        setShareStatus('copying');
        try {
            // Use a robust method to encode Unicode string to Base64.
            const uint8Array = new TextEncoder().encode(JSON.stringify(storybook));
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binaryString += String.fromCharCode(uint8Array[i]);
            }
            const base64Story = btoa(binaryString);
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?story=${encodeURIComponent(base64Story)}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                setShareStatus('copied');
                setTimeout(() => setShareStatus('idle'), 2000);
            }, () => {
                throw new Error("Clipboard write failed");
            });
        } catch (error) {
            console.error("Failed to create share link:", error);
            alert("Não foi possível criar o link de compartilhamento.");
            setShareStatus('idle');
        }
    };

    const toggleFullscreen = () => {
        if (!viewerRef.current) return;
        if (!document.fullscreenElement) {
            viewerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const actionButtonClasses = "p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    const renderImage = () => {
        return (
            <div className="relative w-full h-full bg-slate-900/50 rounded-lg flex items-center justify-center overflow-hidden">
                {pageData.isGeneratingImage ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <LoadingSpinner size="12" />
                        <span className="text-lg font-semibold">Ilustrando...</span>
                    </div>
                ) : pageData.imageUrl ? (
                    <img
                        src={pageData.imageUrl}
                        alt={isCover ? storybook.cover.title : `Ilustração da página ${currentPageIndex + 1}`}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-center text-slate-400 p-4">
                        <p>Falha ao gerar a imagem.</p>
                        <p>Por favor, tente regenerar.</p>
                    </div>
                )}
                {/* Image Actions Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleFocusClick('image')} className={actionButtonClasses} title="Foco">
                       <FocusIcon className="w-5 h-5" />
                   </button>
                   <button onClick={handleEditClick} disabled={!pageData.imageUrl || pageData.isGeneratingImage} className={actionButtonClasses} title="Editar Imagem">
                       <PencilIcon className="w-5 h-5" />
                   </button>
                   <button onClick={handleRegenerateClick} disabled={pageData.isGeneratingImage} className={actionButtonClasses} title="Regenerar Imagem">
                       <RefreshCwIcon className="w-5 h-5" />
                   </button>
                </div>
            </div>
        );
    };

    const renderText = () => {
        return (
            <div className="relative w-full h-full bg-slate-800/50 rounded-lg p-6 flex flex-col justify-center text-center overflow-y-auto">
                <div className="flex-grow flex items-center justify-center">
                    {isCover ? (
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-teal-400 font-display">{storybook.cover.title}</h1>
                            <p className="text-lg lg:text-xl text-slate-300 mt-2">por {storybook.cover.author}</p>
                        </div>
                    ) : (
                        <p className="text-slate-200 text-xl lg:text-2xl leading-relaxed whitespace-pre-wrap">{pageData.text}</p>
                    )}
                </div>
                 {/* Text Actions Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleFocusClick('text')} className={actionButtonClasses} title="Foco">
                       <FocusIcon className="w-5 h-5" />
                   </button>
                   <button onClick={handleToggleNarration} disabled={isGeneratingNarration} className={actionButtonClasses} title={isNarrating ? "Parar Narração" : "Ouvir Narração"}>
                       {isGeneratingNarration ? <LoadingSpinner size="5" color="white" /> : isNarrating ? <PauseIcon className="w-5 h-5 fill-current" /> : <VolumeUpIcon className="w-5 h-5" />}
                   </button>
                </div>
            </div>
        );
    };
    
    const headerButtonClasses = "flex items-center gap-2 py-2 px-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors";

    return (
        <>
            <div ref={viewerRef} className="w-full h-screen bg-slate-900 text-white flex flex-col p-4 md:p-6 lg:p-8 overflow-hidden animate-fade-in">
                {/* Header */}
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <button onClick={onRestart} className={headerButtonClasses}>
                        <RestartIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Começar de Novo</span>
                    </button>
                    <div className="text-center">
                        <h1 className="text-xl md:text-2xl font-bold truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">{storybook.cover.title}</h1>
                        <p className="text-sm text-slate-400">{isCover ? 'Capa' : `Página ${currentPageIndex + 1} de ${totalPages}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleShare} className={headerButtonClasses}>
                            {shareStatus === 'copied' ? 'Copiado!' : <><ShareIcon className="w-6 h-6" /><span className="hidden sm:inline">Compartilhar</span></>}
                        </button>
                        <button onClick={() => setShowPdfModal(true)} className={headerButtonClasses}>
                            <DownloadIcon className="w-6 h-6" />
                            <span className="hidden sm:inline">Baixar</span>
                        </button>
                        <button onClick={toggleFullscreen} className={headerButtonClasses}>
                            {isFullscreen ? <MinimizeIcon className="w-6 h-6" /> : <FullscreenIcon className="w-6 h-6" />}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-grow flex items-center justify-center relative min-h-0">
                    {/* Prev Button */}
                    {currentPageIndex > -1 && (
                        <button onClick={handlePrevPage} className="absolute top-1/2 -translate-y-1/2 left-0 z-10 p-2 bg-black/30 hover:bg-black/60 rounded-full transition-colors text-white lg:left-4">
                            <ChevronLeftIcon className="w-10 h-10" />
                        </button>
                    )}

                    {/* Storybook Page */}
                    <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
                        <div className="group relative">{renderImage()}</div>
                        <div className="group relative">{renderText()}</div>
                    </div>

                    {/* Next Button */}
                    {currentPageIndex < totalPages - 1 && (
                        <button onClick={handleNextPage} className="absolute top-1/2 -translate-y-1/2 right-0 z-10 p-2 bg-black/30 hover:bg-black/60 rounded-full transition-colors text-white lg:right-4">
                            <ChevronRightIcon className="w-10 h-10" />
                        </button>
                    )}
                </div>

            </div>

            {/* Modals */}
            {focusElement && <FocusModeOverlay {...focusElement} onClose={() => setFocusElement(null)} />}
            {showPdfModal && <PdfLayoutModal storybook={storybook} onClose={() => setShowPdfModal(false)} />}
        </>
    );
};
