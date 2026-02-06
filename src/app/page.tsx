"use client";

import React from 'react';
import Link from 'next/link';

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase italic tracking-tighter">
          FASTBEAUTY <span className="text-[#f2b90d]">PRO</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-12 font-medium opacity-80">
          A nova experiência em gestão de beleza está chegando.
          Enquanto preparamos nossa landing page, acesse o sistema abaixo.
        </p>

        <Link
          href="/sistema"
          className="inline-flex items-center gap-2 bg-[#f2b90d] text-[#09090b] px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(242,185,13,0.2)]"
        >
          ACESSAR SISTEMA
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>

      <div className="absolute bottom-10 opacity-20">
        <p className="text-white text-[10px] font-bold tracking-[0.4em] uppercase">Coming Soon • 2024</p>
      </div>
    </div>
  );
}
