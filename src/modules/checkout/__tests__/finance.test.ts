import { expect, test, describe } from 'vitest';
import { calculateOrderTotal, calculateCommission } from '../logic';
describe('Auditoria Financeira', () => {
    test('Total: Serviço(50)+Produto(60)=110', () => {
        expect(calculateOrderTotal([{ type: 'service', price: 50 }, { type: 'product', price: 60 }])).toBe(110);
    });
    test('Comissão: 50% Serviço e 10% Produto', () => {
        expect(calculateCommission({ sTotal: 100, pTotal: 100, sRate: 0.5, pRate: 0.1 })).toBe(60);
    });
});
