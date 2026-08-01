// Entrypoint para a "Setup Node.js App" / Application Manager do cPanel
// (Phusion Passenger). Passenger só precisa que esse arquivo suba um
// servidor HTTP escutando em process.env.PORT — é isso que ele injeta
// automaticamente na hora de rodar a aplicação.
const { createServer } = require('node:http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
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
