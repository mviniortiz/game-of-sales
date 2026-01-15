/**
 * Conditional Logger Utility
 * 
 * Logs only in development mode. In production, logs are suppressed
 * to prevent exposing internal data and improve performance.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('[Module] Message', data);
 *   logger.warn('[Module] Warning', data);
 *   logger.error('[Module] Error', error); // Always logs (even in production)
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log debug messages - only in development
     */
    log: (...args: unknown[]): void => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Log warnings - only in development
     */
    warn: (...args: unknown[]): void => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * Log errors - ALWAYS logs (even in production)
     * Errors should always be tracked for debugging
     */
    error: (...args: unknown[]): void => {
        console.error(...args);
    },

    /**
     * Log info messages - only in development
     */
    info: (...args: unknown[]): void => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Log debug messages with a specific module prefix
     */
    debug: (module: string, message: string, ...args: unknown[]): void => {
        if (isDev) {
            console.log(`[${module}]`, message, ...args);
        }
    },
};

export default logger;
