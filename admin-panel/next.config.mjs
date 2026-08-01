/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autocontido em .next/standalone/ (node_modules já podado, sem
  // precisar rodar "npm install" no servidor) — feito pra deploy manual
  // via zip na VPS/cPanel.
  output: 'standalone',
  experimental: {
    // Padrão do Next é 10MB pra requisições que passam pelo proxy.ts (nosso
    // middleware de sessão intercepta /api/upload) — sets ao vivo chegam a
    // ~170MB, então precisa liberar bem acima disso. Mesmo limite do
    // MAX_FILE_BYTES em app/api/upload/route.ts.
    proxyClientMaxBodySize: 250 * 1024 * 1024,
  },
};

export default nextConfig;
