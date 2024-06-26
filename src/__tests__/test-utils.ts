import { logger } from '@/logging/logger';

/**
 * Stops execution for {@link milliseconds} milliseconds.
 */
export async function milliseconds(milliseconds: number): Promise<void> {
  await new Promise((_) => setTimeout(_, milliseconds));
}

/**
 * Executes the function {@link fn}, retrying if it throws an error.
 * Uses a linear strategy by retrying each {@link delayMs} milliseconds.
 * If {@link maxAttempts} is reached, it throws the error returned by {@link fn} last execution.
 */
export async function retry(
  fn: () => void,
  maxAttempts: number = 40,
  delayMs: number = 10_000,
) {
  await milliseconds(5_000); // Wait 5s for the first execution, then retry every delayMs
  let attempt = 1;
  const execute = async () => {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        logger.error({ msg: 'Exhausted retries', delayMs, maxAttempts });
        throw error;
      }
    }

    await milliseconds(delayMs);
    attempt++;
    return execute();
  };
  return execute();
}
