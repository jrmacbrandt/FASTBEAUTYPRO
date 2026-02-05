"use client";

import React from 'react';

export default function SystemDashboard() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#121214] border border-white/5 p-8 rounded-[2rem] shadow-xl">
                    <h3 className="text-[#f2b90d] text-sm font-black uppercase tracking-widest mb-2 italic">Bem-vindo</h3>
                    <p className="text-white text-2xl font-black">Inicie sua jornada no FastBeauty Pro.</p>
                </div>
            </div>
        </div>
    );
}
