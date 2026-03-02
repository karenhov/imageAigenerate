/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Image as ImageIcon, Wand2, Loader2, Download, RefreshCw, Trash2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [subjectImage, setSubjectImage] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'subject' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'subject') {
          setSubjectImage(reader.result as string);
        } else {
          setBgImage(reader.result as string);
        }
        setProcessedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const reset = () => {
    setSubjectImage(null);
    setBgImage(null);
    setProcessedImage(null);
    setPrompt('');
    setError(null);
  };

  const changeBackground = async () => {
    if (!subjectImage) return;
    if (mode === 'text' && !prompt) return;
    if (mode === 'image' && !bgImage) return;

    setIsLoading(true);
    setError(null);

    try {
      const subjectBase64 = subjectImage.split(',')[1];
      const subjectMime = subjectImage.split(';')[0].split(':')[1];

      const parts: any[] = [
        {
          inlineData: {
            data: subjectBase64,
            mimeType: subjectMime,
          },
        }
      ];

      let instruction = "";
      if (mode === 'text') {
        instruction = `Change the background of this image to: ${prompt}. Keep the main subject intact and blend it naturally with the new background.`;
      } else if (bgImage) {
        const bgBase64 = bgImage.split(',')[1];
        const bgMime = bgImage.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: bgBase64,
            mimeType: bgMime,
          },
        });
        instruction = `Take the main subject from the first image and place it onto the background of the second image. Ensure the lighting and scale look realistic and well-blended.`;
      }

      parts.push({ text: instruction });

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
      });

      let foundImage = false;
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            setProcessedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }
        if (foundImage) break;
      }

      if (!foundImage) {
        setError("The AI didn't return an edited image. Try a different prompt or background.");
      }
    } catch (err: any) {
      console.error('Error changing background:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'edited-background.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight mb-2"
          >
            Background AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500"
          >
            Professional background replacement with AI
          </motion.p>
        </header>

        <main className="space-y-8">
          {/* Mode Switcher */}
          <div className="flex justify-center">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
              <button
                onClick={() => setMode('text')}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Text Prompt
              </button>
              <button
                onClick={() => setMode('image')}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'image' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Image Background
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Inputs */}
            <div className="lg:col-span-1 space-y-6">
              {/* Subject Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2">Main Subject</label>
                <div 
                  onClick={() => subjectInputRef.current?.click()}
                  className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 bg-white ${subjectImage ? 'border-indigo-500' : 'border-slate-300 hover:border-indigo-400'}`}
                >
                  {subjectImage ? (
                    <img src={subjectImage} alt="Subject" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Upload className="text-slate-300 mb-2" size={32} />
                      <p className="text-xs text-slate-400 text-center">Click to upload subject</p>
                    </>
                  )}
                  <input type="file" ref={subjectInputRef} onChange={(e) => handleImageUpload(e, 'subject')} accept="image/*" className="hidden" />
                </div>
              </div>

              {/* Background Input (Text or Image) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2">
                  {mode === 'text' ? 'Background Prompt' : 'Background Image'}
                </label>
                {mode === 'text' ? (
                  <textarea
                    placeholder="Describe the new background..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm"
                  />
                ) : (
                  <div 
                    onClick={() => bgInputRef.current?.click()}
                    className={`aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 bg-white ${bgImage ? 'border-indigo-500' : 'border-slate-300 hover:border-indigo-400'}`}
                  >
                    {bgImage ? (
                      <img src={bgImage} alt="Background" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Layers className="text-slate-300 mb-2" size={32} />
                        <p className="text-xs text-slate-400 text-center">Click to upload background</p>
                      </>
                    )}
                    <input type="file" ref={bgInputRef} onChange={(e) => handleImageUpload(e, 'bg')} accept="image/*" className="hidden" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={changeBackground}
                  disabled={isLoading || !subjectImage || (mode === 'text' ? !prompt : !bgImage)}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  Generate
                </button>
                <button
                  onClick={reset}
                  className="p-4 text-slate-500 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            </div>

            {/* Right Column: Result */}
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2">Result</label>
              <div className="bg-white rounded-[2rem] border border-slate-200 aspect-video lg:aspect-auto lg:h-full min-h-[400px] flex items-center justify-center relative overflow-hidden shadow-sm">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-medium animate-pulse">Processing your image...</p>
                    </motion.div>
                  ) : processedImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full p-8 flex items-center justify-center group"
                    >
                      <img 
                        src={processedImage} 
                        alt="Result" 
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={downloadImage}
                          className="bg-white text-slate-900 px-6 py-3 rounded-xl shadow-xl hover:scale-105 transition-transform flex items-center gap-2 font-bold"
                        >
                          <Download size={20} />
                          Download
                        </button>
                        <button 
                          onClick={changeBackground}
                          className="bg-indigo-600 text-white p-3 rounded-xl shadow-xl hover:scale-105 transition-transform"
                        >
                          <RefreshCw size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center gap-4">
                      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                        <ImageIcon size={48} strokeWidth={1} />
                      </div>
                      <p className="text-sm font-medium">Upload images and click Generate</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 text-center text-slate-400 text-xs">
          <p>Powered by Gemini 2.5 Flash Image Model • High-quality background replacement</p>
        </footer>
      </div>
    </div>
  );
}
