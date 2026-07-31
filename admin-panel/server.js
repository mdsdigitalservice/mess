// Entrypoint para a "Setup Node.js App" do cPanel (Phusion Passenger).
// A Vercel roda o Next.js "sem servidor" — aqui é o oposto: um processo Node
// único e persistente, então esse arquivo é o que o cPanel efetivamente inicia.
// No painel do cPanel, aponte "Application startup file" para server.js.
const { createServer } = require('node:http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// O cPanel injeta PORT sozinho; localmente cai em 3000.
const port = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res))
      .listen(port, () => {
        console.log(`> Painel admin rodando na porta ${port} (${dev ? 'dev' : 'produção'})`);
      })
      .on('error', (err) => {
        console.error('Falha ao iniciar o servidor:', err);
        process.exit(1);
      });
  })
  .catch((err) => {
    console.error('Falha ao preparar o Next.js:', err);
    process.exit(1);
  });
