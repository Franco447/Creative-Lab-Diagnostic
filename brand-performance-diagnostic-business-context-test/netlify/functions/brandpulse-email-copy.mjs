// Read-only approved email closing copy, served from the actual email renderer.
import { BRANDPULSE_CLOSING_COPY } from './brandpulse-email-render.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  return new Response(JSON.stringify({ paragraphs: BRANDPULSE_CLOSING_COPY }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
