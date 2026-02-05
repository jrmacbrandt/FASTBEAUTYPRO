"use client";

import React, { useState } from 'react';

export default function TeamMessagesPage() {
    const [recipient, setRecipient] = useState('all');
    const [messageText, setMessageText] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const team = [
        { id: 'all', name: 'Toda a Equipe' },
        { id: 'b1', name: 'James Carter' },
        { id: 'b2', name: 'Leo Miller' },
    ];

    const handleSendMessage = () => {
        if (!messageText.trim()) return;
        setStatus('sending');

        setTimeout(() => {
            setStatus('success');
            setMessageText('');
            setTimeout(() => setStatus('idle'), 3000);
        }, 1200);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20">
            {status === 'success' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-6">
                    <div className="bg-emerald-500 text-white px-10 py-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center gap-4 pointer-events-auto">
                        <span className="material-symbols-outlined text-5xl font-bold">check</span>
                        <div className="text-center">
                            <h4 className="text-xl font-black italic uppercase">Sucesso</h4>
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Comunicado enviado!</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#121214] p-8 md:p-12 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center gap-4 mb-10">
                    <div className="size-14 bg-[#f2b90d]/10 rounded-2xl flex items-center justify-center text-[#f2b90d]">
                        <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">Novo Comunicado</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Envie avisos para seus colaboradores</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">Destinatário</label>
                        <select
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-[#f2b90d]"
                        >
                            {team.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic">Mensagem</label>
                        <textarea
                            rows={6}
                            placeholder="Digite o conteúdo da mensagem aqui..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-3xl p-6 text-white font-medium outline-none focus:border-[#f2b90d] resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSendMessage}
                        disabled={status === 'sending' || !messageText.trim()}
                        className="w-full bg-[#f2b90d] hover:bg-[#d9a50c] text-black font-black py-6 rounded-[1.8rem] text-lg shadow-2xl shadow-[#f2b90d]/20 transition-all flex items-center justify-center gap-3 uppercase italic disabled:opacity-50"
                    >
                        {status === 'sending' ? 'ENVIANDO...' : 'ENVIAR COMUNICADO'}
                    </button>
                </div>
            </div>
        </div>
    );
}
