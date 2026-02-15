
type Schedule = {
    open: string;
    close: string;
    isOpen: boolean;
};

type BusinessHours = {
    [key: string]: Schedule;
};

const DAY_MAP = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

/**
 * Single source of truth for generating available time slots.
 * Timezone-aware (America/Sao_Paulo) to ensure consistency across environments.
 */
export function getAvailableSlots(
    dateStr: string, // YYYY-MM-DD
    tenantHours: BusinessHours | null,
    barberHours: BusinessHours | null,
    options: { serviceDuration?: number; now?: Date } = {}
): { slots: string[], reason?: string } {
    const { serviceDuration = 30, now = new Date() } = options;

    // Use Sao Paulo timezone for all calculations to avoid server/UTC mismatches
    const spDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
    const spTimeLog = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
    const [spH, spM] = spTimeLog.split(':').map(Number);
    const spCurrentMin = spH * 60 + spM;

    // 1. Parse Input Date (treated as local YYYY-MM-DD)
    const [year, month, day] = dateStr.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[selectedDate.getDay()];

    const isToday = dateStr === spDateStr;

    // 2. Get Rules
    if (!tenantHours || !tenantHours[dayKey]) return { slots: [] };

    const tSchedule = tenantHours[dayKey];
    if (!tSchedule.isOpen) return { slots: [], reason: 'Fechado (Loja)' };

    let bSchedule = (barberHours && barberHours[dayKey]) || tSchedule;
    if (!bSchedule.isOpen) return { slots: [], reason: 'Fechado (Profissional)' };

    const toMin = (t?: string) => {
        if (!t || !t.includes(':')) return -1;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const sOpen = toMin(tSchedule.open);
    const sClose = toMin(tSchedule.close);
    const bOpen = toMin(bSchedule.open || tSchedule.open);
    const bClose = toMin(bSchedule.close || tSchedule.close);

    if (sOpen === -1 || sClose === -1 || bOpen === -1 || bClose === -1) return { slots: [] };

    const startMin = Math.max(sOpen, bOpen);
    const endMin = Math.min(sClose, bClose);

    if (startMin >= endMin) return { slots: [] };

    // 3. Generate slots
    const slots: string[] = [];
    for (let current = startMin; current < endMin; current += 30) {

        // Today Filter: Must be in future (15min buffer applied to SP time)
        if (isToday && current <= (spCurrentMin + 15)) continue;

        // Duration Filter: Must fit before closing
        if (current + serviceDuration > endMin) continue;

        const h = Math.floor(current / 60);
        const m = current % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }

    return { slots };
}

export function generateSlots(start: string, end: string): string[] {
    const slots: string[] = [];
    const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const s = toMin(start);
    const e = toMin(end);
    for (let c = s; c < e; c += 30) {
        const h = Math.floor(c / 60);
        const m = c % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
    return slots;
}
