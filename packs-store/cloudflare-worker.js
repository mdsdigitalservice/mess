/**
 * Vincule este Worker somente à rota rogeriomessdj.com.br/packs*.
 * Configure VERCEL_PACKS_ORIGIN como a URL https://...vercel.app, sem barra final.
 */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const origin = new URL(env.VERCEL_PACKS_ORIGIN);
    const target = new URL(origin);
    target.pathname = incoming.pathname;
    target.search = incoming.search;

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', incoming.host);
    headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const response = await fetch(new Request(target, init));
    const location = response.headers.get('location');

    if (!location) return response;

    const redirect = new URL(location, origin);
    if (redirect.origin !== origin.origin) return response;

    redirect.protocol = incoming.protocol;
    redirect.host = incoming.host;

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('location', redirect.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
