import { expect, test, describe } from 'vitest';
import { validateDataIsolation, canAccessRoute } from '../logic';
describe('Auditoria de Segurança e RBAC', () => {
    test('Isolamento: Usuário não acessa dados de outro Tenant', () => {
        expect(validateDataIsolation('empresa-a', 'empresa-b')).toBe(false);
    });
    test('Hierarquia: Barbeiro não acessa /admin', () => {
        expect(canAccessRoute('barber', '/admin')).toBe(false);
    });
});
