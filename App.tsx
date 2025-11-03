import React, { useState, useCallback } from 'react';
import { StoryFormData, Storybook, ImageForEditing } from './types';
import StoryForm from './components/StoryForm';
import StoryPreview from './components/StoryPreview';
import StorybookViewer from './components/StorybookViewer';
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

    const handleError = (message: string, error?: any) => {
        console.error(message, error);
        setErrorMessage(message);
        setAppState('ERROR');
    };

    const handleGenerateStory = async (formData: StoryFormData) => {
        setAppState('GENERATING_STORY');
        try {
            const storyTextContent = await geminiService.generateStory(formData);
            setTextOnlyStory(storyTextContent);
            setAppState('PREVIEW');
        } catch (error) {
            handleError("Falha ao gerar o texto da história. Por favor, tente novamente.", error);
        }
    };
    
    const handleConfirmStory = async () => {
        if (!textOnlyStory) return;
        
        // Show loading state on the preview screen button
        setAppState('GENERATING_IMAGES');

        // Initialize storybook with loading states
        const initialStorybook: Storybook = {
            cover: { ...textOnlyStory.cover, imageUrl: '', isGeneratingImage: true, mimeType: 'image/png' },
            pages: textOnlyStory.pages.map(p => ({ ...p, imageUrl: '', isGeneratingImage: true, mimeType: 'image/png' }))
        };
        setStorybook(initialStorybook);

        // Immediately switch to the viewer to show progress as images come in
        setAppState('VIEWING'); 

        // Helper to add a delay between API calls to respect rate limits
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // --- Start sequential generation ---

        // Generate cover image first
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

        // Now, generate page images sequentially
        for (let i = 0; i < textOnlyStory.pages.length; i++) {
            // Add a delay to be safe with rate limits.
            await sleep(1500); 

            const page = textOnlyStory.pages[i];
            try {
                const { base64Image, mimeType } = await geminiService.generateImage(page.imagePrompt);
                const imageUrl = `data:${mimeType};base64,${base64Image}`;
                setStorybook(current => {
                    if (!current) return null;
                    const newPages = [...current.pages];
                    newPages[i] = { ...newPages[i], imageUrl, isGeneratingImage: false, mimeType };
                    return { ...current, pages: newPages };
                });
            } catch (error) {
                console.error(`Failed to generate image for page ${i + 1}:`, error);
                // Still update the state to stop the spinner for this page
                setStorybook(current => {
                    if (!current) return null;
                    const newPages = [...current.pages];
                    newPages[i] = { ...newPages[i], imageUrl: '', isGeneratingImage: false };
                    return { ...current, pages: newPages };
                });
            }
        }
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
        
        // Optimistic UI update: show loading on the specific image
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
        
        setAppState('VIEWING'); // Close modal immediately
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
            setStorybook(originalState); // Revert on error
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
                            />
                            {appState === 'EDITING_IMAGE' && (
                                <ImageEditorModal 
                                    imageForEditing={imageForEditing} 
                                    onClose={() => { setAppState('VIEWING'); setImageForEditing(null); }}
                                    onEdit={handleFinishImageEdit}
                                    isEditing={false} // Loading state is handled inside StorybookViewer now
                                />
                            )}
                        </>
                    );
                }
                handleError("Estado de visualização inválido: nenhum storybook encontrado.");
                return null;
            case 'ERROR':
                return (
                    <div className="text-center p-8 max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold text-red-500 mb-4">Ocorreu um Erro</h2>
                        <p className="text-gray-300 mb-6">{errorMessage}</p>
                        <button
                            onClick={handleRestart}
                            className="flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 hover:bg-orange-700 rounded-md text-lg"
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
        <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full">
                {renderContent()}
            </div>
        </main>
    );
};

export default App;
