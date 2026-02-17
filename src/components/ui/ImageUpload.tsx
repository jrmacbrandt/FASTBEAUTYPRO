import React, { useState, useRef } from 'react';
import { processImage } from '@/lib/image-processing';

interface ImageUploadProps {
    currentImage?: string | null;
    onImageSelect: (file: File, previewUrl: string) => void;
    helperText?: string;
    bucket?: string; // For future extensibility, though commonly 'logos'
    className?: string;
}

export default function ImageUpload({ currentImage, onImageSelect, helperText, className }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLoading(true);
            try {
                // Resize to 500x500 (Standard) and convert to WebP
                const processedBlob = await processImage(file, 500, 500, 0.85);
                const processedFile = new File([processedBlob], 'upload.webp', { type: 'image/webp' });

                const objectUrl = URL.createObjectURL(processedBlob);
                setPreview(objectUrl);
                onImageSelect(processedFile, objectUrl);
            } catch (error) {
                console.error('Error processing image:', error);
                alert('Erro ao processar imagem. Tente novamente.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className={`space-y-4 ${className || ''}`}>
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2 relative overflow-hidden min-h-[160px] group ${preview ? 'border-[#f2b90d]/50 bg-black/40' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                    }`}
            >
                {loading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-[#f2b90d] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-bold uppercase text-[#f2b90d] tracking-widest">Processando...</span>
                    </div>
                ) : (
                    <>
                        {preview ? (
                            <>
                                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4 z-0" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                    <span className="material-symbols-outlined text-3xl text-white">edit</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-3xl text-[#f2b90d]">add_a_photo</span>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Adicionar Logo</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex flex-col gap-1.5 px-1 opacity-70">
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Formatos aceitos: JPG, PNG, WEBP</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">fit_screen</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">Tamanho recomendado: 500x500px (Quadrado)</span>
                </div>
            </div>
        </div>
    );
}
