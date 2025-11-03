import React, { useState } from 'react';
import { Storybook } from '../types';
import { CloseIcon, DownloadIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

// Assuming jsPDF is loaded globally via a script tag in the main HTML file.
declare const jspdf: any;

interface PdfLayoutModalProps {
  storybook: Storybook;
  onClose: () => void;
}

type Layout = 'portrait' | 'landscape';

const PdfLayoutModal: React.FC<PdfLayoutModalProps> = ({ storybook, onClose }) => {
  const [layout, setLayout] = useState<Layout>('portrait');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const addImageToPdf = (doc: any, imageData: string, x: number, y: number, width: number, height: number) => {
    return new Promise<void>((resolve) => {
      // In case of error (e.g. image not loaded), we still resolve to not break PDF generation
      try {
        const img = new Image();
        img.onload = () => {
          try {
            // Use 'JPEG' for wider compatibility even if source is PNG
            doc.addImage(imageData, 'JPEG', x, y, width, height);
            resolve();
          } catch (error) {
            console.error("Failed to add image to PDF", error);
            resolve();
          }
        };
        img.onerror = (err) => {
          console.error("Failed to load image for PDF", err);
          // Add a placeholder
          doc.setFillColor(224, 224, 224); // light grey
          doc.rect(x, y, width, height, 'F');
          doc.setTextColor(128, 128, 128); // grey
          doc.setFontSize(10);
          doc.text("Image failed to load", x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' });
          resolve(); 
        };
        img.src = imageData;
      } catch (e) {
        console.error("Error creating image for PDF", e);
        resolve();
      }
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: layout,
            unit: 'px',
            format: 'a4',
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - 2 * margin;

        // --- Cover Page ---
        doc.setFontSize(24);
        doc.text(storybook.cover.title, pageWidth / 2, margin, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`by ${storybook.cover.author}`, pageWidth / 2, margin + 20, { align: 'center' });
        
        if (storybook.cover.imageUrl) {
            const coverImageWidth = contentWidth * 0.8;
            const coverImageHeight = coverImageWidth * (3 / 4);
            const coverImageX = (pageWidth - coverImageWidth) / 2;
            const coverImageY = margin + 40;
            await addImageToPdf(doc, storybook.cover.imageUrl, coverImageX, coverImageY, coverImageWidth, coverImageHeight);
        }

        // --- Story Pages ---
        for (const page of storybook.pages) {
            doc.addPage(layout);
            doc.setFontSize(12);

            const text = page.text;
            let imageUrl = page.imageUrl;
            
            if (layout === 'portrait') {
                const imageHeight = pageHeight * 0.5;
                if (imageUrl) {
                    await addImageToPdf(doc, imageUrl, margin, margin, contentWidth, imageHeight);
                }
                const textY = margin + imageHeight + 20;
                const textLines = doc.splitTextToSize(text, contentWidth);
                doc.text(textLines, margin, textY);
            } else { // landscape
                const imageWidth = (contentWidth / 2) - (margin / 2);
                const imageHeight = imageWidth * (3/4);
                const imageX = margin;
                const imageY = (pageHeight - imageHeight) / 2;
                if (imageUrl) {
                    await addImageToPdf(doc, imageUrl, imageX, imageY, imageWidth, imageHeight);
                }
                const textX = margin + imageWidth + margin;
                const textLines = doc.splitTextToSize(text, imageWidth);
                doc.text(textLines, textX, margin);
            }
        }

        doc.save(`${storybook.cover.title.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("An error occurred while generating the PDF. Please check the console for details.");
    } finally {
        setIsGenerating(false);
        onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-sky-400">Baixar como PDF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <p className="text-gray-300 mb-6">Escolha um layout para o seu livro de histórias em PDF.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Portrait Layout Option */}
            <div
              onClick={() => setLayout('portrait')}
              className={`border-4 rounded-lg p-4 cursor-pointer transition-colors ${layout === 'portrait' ? 'border-sky-500' : 'border-gray-600 hover:border-gray-500'}`}
            >
              <h3 className="font-bold text-lg mb-2 text-center">Retrato</h3>
              <div className="bg-gray-700 aspect-[210/297] w-full mx-auto rounded p-2 flex flex-col gap-2">
                <div className="bg-gray-500 h-1/2 w-full rounded-sm"></div>
                <div className="bg-gray-600 h-1 w-5/6 rounded-sm mt-1"></div>
                <div className="bg-gray-600 h-1 w-full rounded-sm"></div>
                <div className="bg-gray-600 h-1 w-4/6 rounded-sm"></div>
              </div>
            </div>

            {/* Landscape Layout Option */}
            <div
              onClick={() => setLayout('landscape')}
              className={`border-4 rounded-lg p-4 cursor-pointer transition-colors ${layout === 'landscape' ? 'border-sky-500' : 'border-gray-600 hover:border-gray-500'}`}
            >
              <h3 className="font-bold text-lg mb-2 text-center">Paisagem</h3>
              <div className="bg-gray-700 aspect-[297/210] w-full mx-auto rounded p-2 flex gap-2">
                <div className="bg-gray-500 h-full w-1/2 rounded-sm"></div>
                <div className="flex flex-col gap-2 w-1/2 mt-1">
                    <div className="bg-gray-600 h-1 w-5/6 rounded-sm"></div>
                    <div className="bg-gray-600 h-1 w-full rounded-sm"></div>
                    <div className="bg-gray-600 h-1 w-4/6 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex justify-center items-center gap-3 py-3 px-6 bg-sky-600 hover:bg-sky-700 rounded-md text-lg font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="6" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <DownloadIcon className="w-6 h-6" />
                <span>Baixar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfLayoutModal;
