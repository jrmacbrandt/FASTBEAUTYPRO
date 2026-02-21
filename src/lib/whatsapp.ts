/**
 * Utility for standardizing WhatsApp links across the FastBeauty Pro platform.
 * Ensures the Brazilian country code (55) is present and the message is correctly encoded.
 */

export const WhatsAppService = {
    /**
     * Formats a phone number to be WhatsApp-compatible (digits only + country code).
     */
    formatPhone(phone: string): string {
        if (!phone) return '5500000000000';

        let clean = phone.replace(/\D/g, '');

        // If it starts with 0, remove it (common in some regions)
        if (clean.startsWith('0')) clean = clean.substring(1);

        // Add 55 (Brazil) if it seems to be a local number (8 to 11 digits)
        if (clean.length >= 8 && clean.length <= 11) {
            clean = `55${clean}`;
        }

        return clean;
    },

    /**
     * Generates a wa.me link with a pre-filled message.
     */
    generateLink(phone: string, message: string): string {
        const formattedPhone = this.formatPhone(phone);
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    },

    /**
     * Opens WhatsApp in a new tab.
     */
    open(phone: string, message: string): void {
        const link = this.generateLink(phone, message);
        window.open(link, '_blank');
    }
};
