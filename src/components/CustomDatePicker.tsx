"use client";

import React, { useRef } from 'react';

interface CustomDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    isSalon?: boolean;
}

export default function CustomDatePicker({ value, onChange, className, isSalon }: CustomDatePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Format display date (DD/MM/YYYY)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Selecione a data';
        try {
            const parts = dateStr.split('-');
            if (parts.length !== 3) return dateStr;
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div
            className={`relative flex items-center justify-between transition-all ${className}`}
        >
            <span className={`font-bold pointer-events-none z-0 ${!className?.includes('text-') ? (isSalon ? 'text-slate-900' : 'text-white') : ''}`}>
                {formatDate(value)}
            </span>
            <span className="material-symbols-outlined text-primary opacity-60 text-xl pointer-events-none z-0">
                calendar_today
            </span>

            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:dark]"
                onClick={(e) => {
                    if ('showPicker' in HTMLInputElement.prototype) {
                        try {
                            (e.target as HTMLInputElement).showPicker();
                        } catch (err) { }
                    }
                }}
            />
        </div>
    );
}
