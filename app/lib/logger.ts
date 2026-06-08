/* eslint-disable no-console */
/**
 * Lightweight logging wrapper.
 *
 * `debug`/`info` are suppressed in production to keep server and browser
 * output clean, while `warn`/`error` always surface. This is the single
 * sanctioned place that touches the `console` API directly.
 */
const isProduction = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]): void => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]): void => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
