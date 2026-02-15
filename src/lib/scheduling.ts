
type Schedule = {
    open: string;
    close: string;
    isOpen: boolean;
};

type BusinessHours = {
    [key: string]: Schedule;
};

const DAY_MAP = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function getAvailableSlots(
    dateStr: string, // YYYY-MM-DD
    tenantHours: BusinessHours | null,
    barberHours: BusinessHours | null
): { slots: string[], reason?: string } {

    // Fix timezone issue - parse date correctly
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayKey = DAY_MAP[date.getDay()];

    console.log('🔍 [SCHEDULING DEBUG]', {
        dateStr,
        parsedDate: date.toISOString(),
        dayOfWeek: date.getDay(),
        dayKey,
        tenantHours,
        barberHours
    });

    // 1. Validação de Estrutura
    if (!tenantHours || !tenantHours[dayKey]) {
        console.warn('⚠️ Tenant hours not configured, using fallback 09:00-18:00');
        // Fallback se não houver configuração: 09:00 as 18:00
        return { slots: generateSlots('09:00', '18:00') };
    }

    const tSchedule = tenantHours[dayKey];

    console.log('🏪 Tenant Schedule:', { dayKey, tSchedule });

    // 2. Regra da Loja (Prioridade Máxima)
    if (!tSchedule.isOpen) {
        console.log('❌ Store is CLOSED on', dayKey);
        return { slots: [], reason: 'A loja está fechada neste dia.' };
    }

    // 3. Regra do Profissional (Se houver configuração)
    let bSchedule = barberHours && barberHours[dayKey];

    // Se o profissional não tiver config específica, assume o horário da loja ou um default?
    // O sistema salvou "work_hours" no profile. Se for null/empty, assumimos que segue a loja?
    // "O HORARIO DA LOJA SEMPRE TERÁ PRIORIDADE... E O PROFISSIONAL ESTEJA TRABALHANDO... LEVANDO LOJA E PROFISSIONAL EM CONSIDERAÇÃO"
    // Se o profissional não configurou, assumimos que ele segue a loja? Ou que não trabalha?
    // Geralmente, se não configurou, segue a loja. Se configurou, respeita a interseção.
    if (!bSchedule) {
        console.log('👤 Barber has no specific hours, using store hours');
        // Assume horário da loja se não tiver override
        bSchedule = tSchedule;
    }

    console.log('👤 Barber Schedule:', { dayKey, bSchedule });

    if (!bSchedule.isOpen) {
        console.log('❌ Barber is NOT WORKING on', dayKey);
        return { slots: [], reason: 'O profissional não atende neste dia.' };
    }

    // 4. Interseção de Horários
    // CRITICAL: Ensure we have valid time strings
    const storeOpen = String(tSchedule.open || '09:00');
    const storeClose = String(tSchedule.close || '19:00');
    const barberOpen = String(bSchedule.open || storeOpen);
    const barberClose = String(bSchedule.close || storeClose);

    console.log('⏰ Time Strings (RAW):', {
        storeOpen,
        storeClose,
        barberOpen,
        barberClose
    });

    // Convert to minutes for proper numeric comparison
    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const storeOpenMin = toMinutes(storeOpen);
    const storeCloseMin = toMinutes(storeClose);
    const barberOpenMin = toMinutes(barberOpen);
    const barberCloseMin = toMinutes(barberClose);

    // Maior início (numeric comparison)
    const startMin = Math.max(storeOpenMin, barberOpenMin);
    // Menor fim (numeric comparison)
    const endMin = Math.min(storeCloseMin, barberCloseMin);

    // Convert back to time strings
    const start = `${Math.floor(startMin / 60).toString().padStart(2, '0')}:${(startMin % 60).toString().padStart(2, '0')}`;
    const end = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;

    console.log('⏰ Time Intersection:', {
        storeOpen,
        storeClose,
        barberOpen,
        barberClose,
        startMin,
        endMin,
        finalStart: start,
        finalEnd: end
    });

    if (startMin >= endMin) {
        console.error('❌ Invalid time range: start >= end', { start, end, startMin, endMin });
        return { slots: [], reason: 'Incompatibilidade de horários (Início maior que fim).' };
    }

    // 5. Gerar Slots
    const slots = generateSlots(start, end);

    console.log('📅 Generated slots:', slots);

    // EMERGENCY FALLBACK: If no slots generated but times are valid, force generate
    if (slots.length === 0 && start < end) {
        console.error('🚨 EMERGENCY: No slots generated, forcing fallback!');
        const emergencySlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
            '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
            '18:00', '18:30', '19:00'];
        return { slots: emergencySlots };
    }

    // 6. Filtrar Passado (Se for hoje)
    const now = new Date();
    // Use local date string to avoid UTC offset issues (e.g., 23:00 BRT is already next day in UTC)
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;

    if (isToday) {
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMin;

        const filteredSlots = slots.filter(time => {
            const [h, m] = time.split(':').map(Number);
            const timeVal = h * 60 + m;
            // Margem de segurança de 15 minutos
            return timeVal > currentTimeVal + 15;
        });

        console.log('🕐 Today - filtered past slots:', {
            currentTime: `${currentHour}:${currentMin}`,
            totalSlots: slots.length,
            availableSlots: filteredSlots.length
        });

        return { slots: filteredSlots };
    }

    return { slots };
}

function generateSlots(start: string, end: string): string[] {
    const slots: string[] = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    console.log('🔧 generateSlots called:', { start, end, startH, startM, endH, endM });

    // Convert to total minutes since midnight
    let startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    console.log('🔧 Time in minutes:', { startMinutes, endMinutes });

    // Round start to nearest 30-minute interval (ceiling)
    // Examples: 14:15 -> 14:30, 14:30 -> 14:30, 14:45 -> 15:00
    const remainder = startMinutes % 30;
    if (remainder !== 0) {
        startMinutes += (30 - remainder);
    }

    console.log('🔧 Normalized start minutes:', startMinutes);

    // Generate slots every 30 minutes
    let currentMinutes = startMinutes;
    while (currentMinutes < endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(timeStr);
        currentMinutes += 30;
    }

    console.log('🔧 Generated slots:', slots);

    return slots;
}
