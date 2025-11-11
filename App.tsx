
import React, { useState, useCallback, useEffect } from 'react';
import { StoryFormData, Storybook, ImageForEditing } from './types';
import StoryForm from './components/StoryForm';
import StoryPreview from './components/StoryPreview';
import { StorybookViewer } from './components/StorybookViewer';
import ImageEditorModal from './components/ImageEditorModal';
import * as geminiService from './services/geminiService';
import { RestartIcon } from './components/Icons';

type AppState = 'FORM' | 'GENERATING_STORY' | 'PREVIEW' | 'GENERATING_IMAGES' | 'VIEWING' | 'EDITING_IMAGE' | 'ERROR';

type TextOnlyStorybook = Omit<Storybook, 'pages' | 'cover'> & { 
  cover: Omit<Storybook['cover'], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>, 
  pages: Array<Omit<Storybook['pages'][0], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>> 
};

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('FORM');
    const [storybook, setStorybook] = useState<Storybook | null>(null);
    const [textOnlyStory, setTextOnlyStory] = useState<TextOnlyStorybook | null>(null);
    const [imageForEditing, setImageForEditing] = useState<ImageForEditing | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storyDataFromUrl = params.get('story');

        if (storyDataFromUrl) {
            try {
                // BUGFIX: Use a robust method to decode Base64 to a Unicode string.
                const binaryString = atob(storyDataFromUrl);
                const uint8Array = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                const decodedString = new TextDecoder().decode(uint8Array);
                const parsedStorybook = JSON.parse(decodedString);

                if (parsedStorybook && parsedStorybook.cover && parsedStorybook.pages) {
                    setStorybook(parsedStorybook);
                    setAppState('VIEWING');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }
            } catch (error) {
                console.error("Falha ao carregar a história da URL:", error);
                alert("Não foi possível carregar a história compartilhada. O link pode estar corrompido.");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        try {
            const savedStoryString = localStorage.getItem('eraUmaVez_savedStory');
            if (savedStoryString) {
                const parsedStorybook = JSON.parse(savedStoryString);
                if (parsedStorybook && parsedStorybook.cover && parsedStorybook.pages) {
                    setStorybook(parsedStorybook);
                    setAppState('VIEWING');
                }
            }
        } catch (error) {
            console.error("Falha ao carregar a história do localStorage:", error);
            localStorage.removeItem('eraUmaVez_savedStory');
        }
    }, []);

    const handleError = (message: string, error?: any) => {
        console.error(message, error);
        setErrorMessage(message);
        setAppState('ERROR');
    };

    const handleGenerateStory = async (formData: StoryFormData) => {
        setAppState('GENERATING_STORY');

        const stripPrefix = (str: string) => str.split(' ').slice(1).join(' ');

        const cleanFormData: StoryFormData = {
            ...formData,
            genre: stripPrefix(formData.genre),
            tone: stripPrefix(formData.tone),
            audience: stripPrefix(formData.audience),
            style: stripPrefix(formData.style),
        };

        try {
            const storyTextContent = await geminiService.generateStory(cleanFormData);
            
            if (storyTextContent && storyTextContent.cover && Array.isArray(storyTextContent.pages)) {
                // Defensive sort to ensure pages are always in order.
                storyTextContent.pages.sort((a, b) => a.pageNumber - b.pageNumber);
                setTextOnlyStory(storyTextContent);
                setAppState('PREVIEW');
            } else {
                throw new Error("A resposta do modelo de IA não continha uma estrutura de história válida. O objeto pode estar vazio ou malformado.");
            }
        } catch (error) {
            handleError("Falha ao gerar o texto da história. Por favor, tente novamente.", error);
        }
    };
    
    const handleConfirmStory = async () => {
        if (!textOnlyStory) return;
        
        setAppState('GENERATING_IMAGES');

        // Allow UI to update to show loading state before blocking thread
        await new Promise(resolve => setTimeout(resolve, 0));

        const initialStorybook: Storybook = {
            cover: { ...textOnlyStory.cover, imageUrl: '', isGeneratingImage: true, mimeType: 'image/png' },
            pages: textOnlyStory.pages.map(p => ({ ...p, imageUrl: '', isGeneratingImage: true, mimeType: 'image/png' }))
        };
        setStorybook(initialStorybook);
        setAppState('VIEWING'); 

        try {
            const { base64Image, mimeType } = await geminiService.generateImage(textOnlyStory.cover.imagePrompt);
            const imageUrl = `data:${mimeType};base64,${base64Image}`;
            setStorybook(current => {
                if (!current) return null;
                return { ...current, cover: { ...current.cover, imageUrl, isGeneratingImage: false, mimeType } };
            });
        } catch (error) {
            console.error(`Failed to generate cover image`, error);
            setStorybook(current => {
                if (!current) return null;
                return { ...current, cover: { ...current.cover, imageUrl: '', isGeneratingImage: false } };
            });
        }

        // BUGFIX: Generate page images in parallel for a massive speed boost.
        const pageImagePromises = textOnlyStory.pages.map((page, index) => 
            geminiService.generateImage(page.imagePrompt)
                .then(({ base64Image, mimeType }) => {
                    const imageUrl = `data:${mimeType};base64,${base64Image}`;
                    setStorybook(current => {
                        if (!current) return null;
                        const newPages = [...current.pages];
                        newPages[index] = { ...newPages[index], imageUrl, isGeneratingImage: false, mimeType };
                        return { ...current, pages: newPages };
                    });
                })
                .catch(error => {
                    console.error(`Falha ao gerar imagem para a página ${index + 1}:`, error);
                    setStorybook(current => {
                        if (!current) return null;
                        const newPages = [...current.pages];
                        newPages[index] = { ...newPages[index], imageUrl: '', isGeneratingImage: false };
                        return { ...current, pages: newPages };
                    });
                })
        );

        await Promise.all(pageImagePromises);
    };

    const handleStartImageEdit = (image: ImageForEditing) => {
        setImageForEditing(image);
        setAppState('EDITING_IMAGE');
    };

    const handleFinishImageEdit = async (prompt: string) => {
        if (!imageForEditing || !storybook) return;
        
        const base64Data = imageForEditing.imageUrl.split(',')[1];
        if (!base64Data) {
            handleError("Dados de imagem inválidos para edição.");
            return;
        }

        const originalState = { ...storybook };
        
        if (imageForEditing.type === 'cover') {
            setStorybook(prev => prev ? ({ ...prev, cover: { ...prev.cover, isGeneratingImage: true } }) : null);
        } else {
             setStorybook(prev => {
                if (!prev) return null;
                const newPages = [...prev.pages];
                newPages[imageForEditing.index] = { ...newPages[imageForEditing.index], isGeneratingImage: true };
                return { ...prev, pages: newPages };
            });
        }
        
        setAppState('VIEWING');
        setImageForEditing(null);

        try {
            const { base64Image, mimeType } = await geminiService.editImage(base64Data, imageForEditing.mimeType, prompt);
            const newImageUrl = `data:${mimeType};base64,${base64Image}`;
            
            if (imageForEditing.type === 'cover') {
                 setStorybook(prev => prev ? ({ ...prev, cover: { ...prev.cover, imageUrl: newImageUrl, mimeType, isGeneratingImage: false } }) : null);
            } else {
                 setStorybook(prev => {
                    if (!prev) return null;
                    const newPages = [...prev.pages];
                    const oldPage = newPages[imageForEditing.index];
                    newPages[imageForEditing.index] = { ...oldPage, imageUrl: newImageUrl, mimeType, isGeneratingImage: false };
                    return { ...prev, pages: newPages };
                });
            }
        } catch (error) {
            handleError("Falha ao editar a imagem. Revertendo.", error);
            setStorybook(originalState);
        }
    };
    
    const handleRegenerateImage = async (imageInfo: { type: 'cover' | 'page'; index: number }) => {
        if (!storybook) return;

        const { type, index } = imageInfo;
        const prompt = type === 'cover' ? storybook.cover.imagePrompt : storybook.pages[index].imagePrompt;

        if (!prompt) {
            handleError("Não foi possível encontrar o prompt para regenerar esta imagem.");
            return;
        }

        if (type === 'cover') {
            setStorybook(prev => prev ? ({ ...prev, cover: { ...prev.cover, isGeneratingImage: true } }) : null);
        } else {
            setStorybook(prev => {
                if (!prev) return null;
                const newPages = [...prev.pages];
                newPages[index] = { ...newPages[index], isGeneratingImage: true };
                return { ...prev, pages: newPages };
            });
        }

        try {
            const { base64Image, mimeType } = await geminiService.generateImage(prompt);
            const newImageUrl = `data:${mimeType};base64,${base64Image}`;

            if (type === 'cover') {
                setStorybook(prev => prev ? ({ ...prev, cover: { ...prev.cover, imageUrl: newImageUrl, mimeType, isGeneratingImage: false } }) : null);
            } else {
                setStorybook(prev => {
                    if (!prev) return null;
                    const newPages = [...prev.pages];
                    const oldPage = newPages[index];
                    newPages[index] = { ...oldPage, imageUrl: newImageUrl, mimeType, isGeneratingImage: false };
                    return { ...prev, pages: newPages };
                });
            }
        } catch (error) {
            handleError(`Falha ao regenerar a imagem.`, error);
            if (type === 'cover') {
                setStorybook(prev => prev ? ({ ...prev, cover: { ...prev.cover, isGeneratingImage: false } }) : null);
            } else {
                setStorybook(prev => {
                    if (!prev) return null;
                    const newPages = [...prev.pages];
                    newPages[index] = { ...newPages[index], isGeneratingImage: false };
                    return { ...prev, pages: newPages };
                });
            }
        }
    };

    const handleGenerateSpeech = useCallback(async (text: string): Promise<string | null> => {
        try {
            return await geminiService.generateSpeech(text);
        } catch (error) {
            console.error("Failed to generate speech", error);
            alert("Desculpe, não foi possível gerar a narração no momento.");
            return null;
        }
    }, []);

    const handleRestart = () => {
        setStorybook(null);
        setTextOnlyStory(null);
        setImageForEditing(null);
        setErrorMessage('');
        window.history.replaceState({}, document.title, window.location.pathname);
        try {
            localStorage.removeItem('eraUmaVez_savedStory');
        } catch (error) {
            console.error("Não foi possível remover a história salva do localStorage", error);
        }
        setAppState('FORM');
    };

    const renderContent = () => {
        switch (appState) {
            case 'FORM':
                return <StoryForm onSubmit={handleGenerateStory} isGenerating={false} />;
            case 'GENERATING_STORY':
                return <StoryForm onSubmit={handleGenerateStory} isGenerating={true} />;
            case 'PREVIEW':
                if (textOnlyStory) {
                    return <StoryPreview story={textOnlyStory} onConfirm={handleConfirmStory} onCancel={handleRestart} isGeneratingImages={false} />;
                }
                handleError("Estado de pré-visualização inválido: nenhum texto de história encontrado.");
                return null;
            case 'GENERATING_IMAGES':
                 if (textOnlyStory) {
                    return <StoryPreview story={textOnlyStory} onConfirm={handleConfirmStory} onCancel={handleRestart} isGeneratingImages={true} />;
                }
                handleError("Estado de geração de imagem inválido: nenhum texto de história encontrado.");
                return null;
            case 'VIEWING':
            case 'EDITING_IMAGE':
                if (storybook) {
                    return (
                        <>
                            <StorybookViewer 
                                storybook={storybook} 
                                onRestart={handleRestart} 
                                onEditImage={handleStartImageEdit}
                                onGenerateSpeech={handleGenerateSpeech}
                                onRegenerateImage={handleRegenerateImage}
                            />
                            {appState === 'EDITING_IMAGE' && (
                                <ImageEditorModal 
                                    imageForEditing={imageForEditing} 
                                    onClose={() => { setAppState('VIEWING'); setImageForEditing(null); }}
                                    onEdit={handleFinishImageEdit}
                                    isEditing={false}
                                />
                            )}
                        </>
                    );
                }
                if (!window.location.search.includes('story')) {
                    handleError("Estado de visualização inválido: nenhum storybook encontrado.");
                }
                return <StoryForm onSubmit={handleGenerateStory} isGenerating={false} />;

            case 'ERROR':
                return (
                    <div className="text-center p-8 max-w-2xl mx-auto glass-card">
                        <h2 className="text-2xl font-bold text-red-500 mb-4">Ocorreu um Erro</h2>
                        <p className="text-slate-300 mb-6">{errorMessage}</p>
                        <button
                            onClick={handleRestart}
                            className="flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg text-lg text-white font-semibold shadow-lg transition-transform transform hover:scale-105"
                        >
                            <RestartIcon className="w-6 h-6" />
                            <span>Tentar Novamente</span>
                        </button>
                    </div>
                );
            default:
                return <div>Estado desconhecido</div>;
        }
    };
    
    return (
        <main className="w-full min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full">
                {renderContent()}
            </div>
        </main>
    );
};

export default App;
