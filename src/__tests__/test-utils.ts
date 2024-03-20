/**
 * Stops execution for {@link milliseconds} milliseconds.
 */
export async function milliseconds(milliseconds: number): Promise<void> {
  await new Promise((_) => setTimeout(_, milliseconds));
}

/**
 * Stops execution for {@link seconds} seconds.
 */
export async function seconds(seconds: number): Promise<void> {
  return milliseconds(seconds * 1000);
}
