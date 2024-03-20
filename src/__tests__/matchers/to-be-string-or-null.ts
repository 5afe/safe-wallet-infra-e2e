import { expect } from '@jest/globals';

expect.extend({
  anyStringOrNull: (actual) => ({
    message: () => `expected ${actual} to be string or null`,
    pass: actual === null || typeof actual === 'string',
  }),
});

declare module 'expect' {
  interface AsymmetricMatchers {
    anyStringOrNull(): void;
  }

  interface Matchers<R> {
    anyStringOrNull(): R;
  }
}
