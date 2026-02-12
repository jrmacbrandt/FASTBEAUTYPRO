
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

    const date = new Date(dateStr + 'T00:00:00');
    const dayKey = DAY_MAP[date.getDay()];

    // 1. Validação de Estrutura
    if (!tenantHours || !tenantHours[dayKey]) {
        // Fallback se não houver configuração: 09:00 as 18:00
        return { slots: generateSlots('09:00', '18:00') };
    }

    const tSchedule = tenantHours[dayKey];

    // 2. Regra da Loja (Prioridade Máxima)
    if (!tSchedule.isOpen) {
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
        // Assume horário da loja se não tiver override
        bSchedule = tSchedule;
    }

    if (!bSchedule.isOpen) {
        return { slots: [], reason: 'O profissional não atende neste dia.' };
    }

    // 4. Interseção de Horários
    // Maior iníco
    const start = tSchedule.open > bSchedule.open ? tSchedule.open : bSchedule.open;
    // Menor fim
    const end = tSchedule.close < bSchedule.close ? tSchedule.close : bSchedule.close;

    if (start >= end) {
        return { slots: [], reason: 'Incompatibilidade de horários (Início maior que fim).' };
    }

    // 5. Gerar Slots
    const slots = generateSlots(start, end);

    // 6. Filtrar Passado (Se for hoje)
    const now = new Date();
    const isToday = dateStr === now.toISOString().split('T')[0];

    if (isToday) {
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMin;

        return {
            slots: slots.filter(time => {
                const [h, m] = time.split(':').map(Number);
                const timeVal = h * 60 + m;
                // Margem de segurança de 30min? Ou imediato?
                // Vamos dar 15 minutos de antecedência mínima
                return timeVal > currentTimeVal + 15;
            })
        };
    }

    return { slots };
}

function generateSlots(start: string, end: string): string[] {
    const slots: string[] = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
        const timeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
        slots.push(timeStr);

        // Incremento de 30 minutos (Regra de Negócio padrão para salões)
        // O usuário pediu "10:00, 11:00" no código original, mas o admin config mostra 30min steps.
        // Vou usar 30 min para maior flexibilidade, ou 1h se preferir.
        // O código original tinha steps de 1h. Vou manter 1h p/ ser conservador ou 30min?
        // Admin config usa 30min. Vou usar 1h para não poluir demais a tela mobile, ou 30min se couber.
        // Melhor: 1h por enquanto para manter o visual limpo, mas a lógica suporta 30.
        // Update: O usuário quer "ASSERTIVIDADE". 30min é mais assertivo.
        currentM += 30;
        if (currentM >= 60) {
            currentH++;
            currentM = 0;
        }
    }

    return slots;
}
