/**
 * Robust date utilities for FastBeautyPro.
 * Follows Omni-Shield for maximum reliability.
 */

/**
 * Adds a specific number of months to a date, correctly handling month-end overlaps.
 * (e.g., Jan 31 + 1 month -> Feb 28/29)
 * Uses UTC methods to ensure consistency between environments and avoid timezone shifts.
 * 
 * @param date The starting date
 * @param months Number of months to add
 * @returns A new Date object
 */
export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const originalDate = d.getUTCDate();
    const desiredMonth = d.getUTCMonth() + months;

    // Set to the first of the desired month
    d.setUTCMonth(desiredMonth, 1);

    // Find the last day of the desired month
    // We create a date for the 0th day of the NEXT month in UTC
    const lastDayOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

    // Use the minimum of original day or last day of new month
    d.setUTCDate(Math.min(originalDate, lastDayOfMonth));

    return d;
}

/**
 * Standard addition of days using UTC.
 */
export function addDays(date: Date, days: number): Date {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}
