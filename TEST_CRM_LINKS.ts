console.log("Running standalone script");


/**
 * Gera o link `wa.me` com mensagem codificada.
 * (Copied from src/lib/campaigns.ts for validation purposes)
 */
function generateWhatsAppLink(phone: string, template: string, clientName: string) {
    // Substituir variáveis
    const message = template.replace('{name}', clientName.split(' ')[0]);

    // Encode
    const encodedMessage = encodeURIComponent(message);

    // Retornar URL
    return `https://wa.me/55${phone}?text=${encodedMessage}`;
}

// Test Cases
const tests = [
    {
        name: 'Simple Message',
        template: 'Olá {name}, tudo bem?',
        clientName: 'João',
    },
    {
        name: 'With Line Breaks and Special Chars',
        template: 'Ei {name}!\nPromoção de Verão: 50% OFF.\nVenha conferir!',
        clientName: 'Maria',
    }
];

console.log('--- START CRM LINK VALIDATION ---');

tests.forEach(test => {
    // Arbitrary phone number for testing
    const phone = '5511999999999';

    // Generate the full link using the function
    const link = generateWhatsAppLink(phone, test.template, test.clientName);

    // Calculate expected encoded message part to verify
    const expectedMessageOne = test.template.replace('{name}', test.clientName.split(' ')[0]);
    const encodedExpected = encodeURIComponent(expectedMessageOne);

    console.log(`\nTEST: ${test.name}`);
    console.log(`Generated Link: ${link}`);
    console.log(`Expected Encoded Part: ${encodedExpected}`);

    if (link.includes(encodedExpected)) {
        console.log('✅ URL Encoding: PASS');
    } else {
        console.error('❌ URL Encoding: FAIL');
        console.error(`Expected link to contain: ${encodedExpected}`);
    }
});

console.log('\n--- END VALIDATION ---');
