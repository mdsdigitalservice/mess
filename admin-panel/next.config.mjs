/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autocontido em .next/standalone/ (node_modules já podado, sem
  // precisar rodar "npm install" no servidor) — feito pra deploy manual
  // via zip na VPS/cPanel.
  output: 'standalone',
};

export default nextConfig;
