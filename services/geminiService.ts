import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryFormData, Storybook } from '../types';

// Per guidelines, API key is from environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const storyGenerationModel = 'gemini-2.5-pro'; // Complex text task
const imageGenerationModel = 'imagen-4.0-generate-001'; // High-quality images
const imageEditingModel = 'gemini-2.5-flash-image'; // General image editing
const ttsModel = 'gemini-2.5-flash-preview-tts'; // Text-to-speech

/**
 * The partial storybook structure returned by the text generation model.
 */
type TextOnlyStorybook = Omit<Storybook, 'pages' | 'cover'> & { 
  cover: Omit<Storybook['cover'], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>, 
  pages: Array<Omit<Storybook['pages'][0], 'imageUrl' | 'isGeneratingImage' | 'mimeType'>> 
};

/**
 * Generates the story text, page by page, along with image prompts for each page.
 * @param formData The user's input for the story.
 * @returns A storybook object with text and image prompts, but no images yet.
 */
export async function generateStory(formData: StoryFormData): Promise<TextOnlyStorybook> {
    const {
        title, genre, tone, characters, setting, plot, numPages, audience, style, author, extra
    } = formData;

    const prompt = `
        Você é um autor especialista em livros de histórias infantis e um ilustrador. Sua tarefa é criar um livro de histórias completo com base nas especificações do usuário.
        O livro deve ser dividido em uma capa e ${numPages} páginas.
        Para cada página e a capa, você deve escrever o texto da história e um prompt de imagem detalhado e vívido para o ilustrador.

        Especificações do usuário:
        - Título: ${title}
        - Autor: ${author}
        - Gênero: ${genre}
        - Tom: ${tone}
        - Público: ${audience}
        - Estilo de Arte para Ilustrações: ${style}
        - Personagens Principais: ${characters}
        - Cenário: ${setting}
        - Enredo Principal: ${plot}
        - Número de Páginas: ${numPages}
        - Instruções Adicionais: ${extra}

        Instruções de Saída:
        - O texto da história deve ser envolvente e apropriado para o público-alvo (${audience}).
        - Cada página deve ter um parágrafo de texto conciso.
        - Os prompts de imagem são CRÍTICOS. Eles devem ser extremamente detalhados e vívidos para que um modelo de IA de geração de imagem possa criar uma ilustração perfeita.
        - Para cada prompt de imagem, siga esta estrutura para obter melhores resultados:
            1.  **Estilo de Arte:** Comece SEMPRE com o estilo de arte especificado: "${style}".
            2.  **Sujeito Principal:** Descreva claramente o(s) personagem(ns) principal(is) da cena, incluindo suas expressões, roupas e emoções. Ex: "Léo, o coelho curioso com olhos brilhantes e um colete vermelho".
            3.  **Ação e Pose:** Descreva o que o personagem está fazendo. Ex: "saltitando animadamente por um caminho sinuoso".
            4.  **Cenário e Fundo:** Pinte um quadro do ambiente com detalhes ricos. Mencione a hora do dia, o clima e os elementos de fundo. Ex: "em uma floresta ensolarada de manhã, com raios de sol passando pelas árvores altas e cogumelos coloridos no chão da floresta".
            5.  **Composição e Enquadramento:** Dê dicas sobre como a cena deve ser enquadrada. Ex: "close-up", "visão ampla", "visto de baixo".
            6.  **Iluminação e Cor:** Descreva a iluminação e a paleta de cores para definir o humor. Ex: "iluminação quente e dourada, cores vibrantes e saturadas".
        - **Exemplo de um prompt de imagem RUIM:** "Coelho na floresta."
        - **Exemplo de um prompt de imagem BOM:** "${style} de um coelho jovem e curioso chamado Léo, com um colete vermelho, saltitando animadamente por um caminho sinuoso em uma floresta mágica e ensolarada. O fundo está cheio de árvores falantes com rostos amigáveis e riachos cintilantes. Iluminação quente e dourada da manhã, paleta de cores vibrantes. Visão ampla para mostrar a vastidão da floresta."
        - Certifique-se de que cada prompt de imagem seja exclusivo para a página e reflita o texto da história dessa página.
        - Responda APENAS com um objeto JSON. Não inclua nenhuma formatação markdown ou texto explicativo antes ou depois do JSON.

        O objeto JSON deve ter a seguinte estrutura:
        {
          "cover": {
            "title": "Seu Título Gerado",
            "author": "Nome do Autor",
            "imagePrompt": "Prompt de imagem detalhado para a capa."
          },
          "pages": [
            {
              "pageNumber": 1,
              "text": "Texto da história para a página 1.",
              "imagePrompt": "Prompt de imagem detalhado para a página 1."
            },
            // ... mais objetos de página
          ]
        }
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            cover: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    author: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                },
                required: ['title', 'author', 'imagePrompt'],
            },
            pages: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        pageNumber: { type: Type.INTEGER },
                        text: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                    },
                    required: ['pageNumber', 'text', 'imagePrompt'],
                },
            },
        },
        required: ['cover', 'pages'],
    };

    const response = await ai.models.generateContent({
        model: storyGenerationModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    try {
        const storyData = JSON.parse(response.text);
        return storyData as TextOnlyStorybook;
    } catch (e) {
        console.error("Failed to parse story JSON:", response.text);
        throw new Error("A resposta do modelo não era um JSON válido.");
    }
}

/**
 * Generates an image based on a prompt.
 * @param prompt The detailed image prompt.
 * @returns An object containing the base64 encoded image and its MIME type.
 */
export async function generateImage(prompt: string): Promise<{ base64Image: string, mimeType: string }> {
    const response = await ai.models.generateImages({
        model: imageGenerationModel,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '4:3', // Good landscape ratio for a storybook page
        },
    });

    const base64Image = response.generatedImages[0].image.imageBytes;
    return { base64Image, mimeType: 'image/png' };
}

/**
 * Edits an existing image using a text prompt.
 * @param base64ImageData The base64 encoded string of the image to edit.
 * @param mimeType The MIME type of the image.
 * @param prompt The user's instruction for editing the image.
 * @returns An object containing the new base64 encoded image and its MIME type.
 */
export async function editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<{ base64Image: string, mimeType: string }> {
    const imagePart = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: imageEditingModel,
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) {
        return { base64Image: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
    }
    throw new Error("Nenhuma imagem foi gerada a partir da edição.");
}

/**
 * Generates speech from text.
 * @param text The text to convert to speech.
 * @returns A base64 encoded string of the raw audio data.
 */
export async function generateSpeech(text: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [{ parts: [{ text: `Diga com uma voz de contador de histórias: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant, neutral voice
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Nenhum dado de áudio recebido.");
    }
    return base64Audio;
}