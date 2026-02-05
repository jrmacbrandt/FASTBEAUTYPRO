export function calculateOrderTotal(items: { type: string; price: number }[]) {
    return items.reduce((acc, item) => acc + item.price, 0);
}

export function calculateCommission({ sTotal, pTotal, sRate, pRate }: { sTotal: number; pTotal: number; sRate: number; pRate: number }) {
    return (sTotal * sRate) + (pTotal * pRate);
}
