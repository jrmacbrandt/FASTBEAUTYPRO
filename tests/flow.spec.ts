import { test, expect } from '@playwright/test';
test('Fluxo de Agendamento Completo', async ({ page }) => {
    await page.goto('http://localhost:3000/sistema');
    await page.click('text=Corte');
    await page.fill('input[name="customer_name"]', 'Teste Auditoria');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*agradecimento/);
});
