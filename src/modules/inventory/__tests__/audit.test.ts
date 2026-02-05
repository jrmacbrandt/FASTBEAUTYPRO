import { expect, test, describe } from 'vitest';
import { canAddProduct, isWebP } from '../logic';
describe('Auditoria de Estoque e Performance', () => {
    test('Bloqueio: Produto com estoque 0', () => {
        expect(canAddProduct({ current_stock: 0 })).toBe(false);
    });
    test('Mídia: Formato deve ser WebP', () => {
        expect(isWebP('image/webp')).toBe(true);
    });
});
