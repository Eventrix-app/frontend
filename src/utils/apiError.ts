// NestJS's ValidationPipe returns `message` as either a single string or an array of
// per-field validation strings — surface both cases instead of "[object Object]".
export function extractErrorMessage(e: any, fallback: string): string {
  const msg = e?.data?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  if (typeof msg === 'string' && msg) return msg;
  return fallback;
}
