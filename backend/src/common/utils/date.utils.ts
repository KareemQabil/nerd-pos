// Date Utilities
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md

export const DateUtils = {
    /**
     * Get current business date (may differ from calendar date based on close time)
     */
    getBusinessDate(closeHour: number = 2): Date {
        const now = new Date();
        // If before close hour (e.g., 2 AM), consider it previous day's business
        if (now.getHours() < closeHour) {
            now.setDate(now.getDate() - 1);
        }
        now.setHours(0, 0, 0, 0);
        return now;
    },

    /**
     * Format date as ISO string (date only)
     */
    toISODate(date: Date): string {
        return date.toISOString().split('T')[0];
    },

    /**
     * Format date as ZATCA required format (YYYY-MM-DD)
     */
    toZATCADate(date: Date): string {
        return date.toISOString().split('T')[0];
    },

    /**
     * Format datetime as ZATCA required format
     */
    toZATCADateTime(date: Date): string {
        return date.toISOString();
    },

    /**
     * Check if date is today
     */
    isToday(date: Date): boolean {
        const today = new Date();
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    },

    /**
     * Add days to date
     */
    addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Get start of day
     */
    startOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    },

    /**
     * Get end of day
     */
    endOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    },
};
