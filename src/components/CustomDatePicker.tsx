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

    const handleClick = () => {
        if (inputRef.current) {
            // Some browsers support showPicker()
            if ('showPicker' in HTMLInputElement.prototype) {
                try {
                    inputRef.current.showPicker();
                } catch (e) {
                    inputRef.current.click();
                }
            } else {
                inputRef.current.click();
            }
        }
    };

    // Format display date (DD/MM/YYYY)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Selecione a data';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div
            onClick={handleClick}
            className={`cursor-pointer relative flex items-center justify-between transition-all ${className}`}
        >
            <span className="font-bold">{formatDate(value)}</span>
            <span className="material-symbols-outlined text-primary opacity-60 text-xl">calendar_today</span>

            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 pointer-events-none w-full h-full [color-scheme:dark]"
                style={{ visibility: 'hidden', position: 'absolute', left: 0, top: 0 }}
            />

            {/* Standard HTML5 date picker usually doesn't trigger on text click if invisible, 
                so we use showPicker() or overlay the input with low opacity if needed.
                But many modern browsers handle showPicker().
                Let's use a standard input but styled to look premium and trigger on click.
            */}
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
            />
        </div>
    );
}
