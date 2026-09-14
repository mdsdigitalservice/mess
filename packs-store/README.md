# DJ Rogério Mess · Loja de Packs

Aplicação independente para a rota `https://rogeriomessdj.com.br/packs`, hospedada na Vercel.

## Arquitetura

- Next.js na Vercel: loja, checkout, login e painel administrativo;
- Neon Postgres: catálogo, pedidos, aprovação e contagem de downloads;
- Cloudflare R2 privado: capas, prévias, ZIPs e comprovantes;
- Cloudflare Worker na rota `/packs*`: mantém o site principal no cPanel e encaminha somente a loja para a Vercel.

## Configuração

1. Importe este diretório como um projeto Vercel com **Root Directory** `packs-store`.
2. Instale Neon no projeto e use a variável `DATABASE_URL`.
3. Crie um bucket R2 privado chamado `rogerio-mess-packs` e um token limitado a leitura/gravação nesse bucket.
4. Copie as chaves de `.env.example` para Development, Preview e Production na Vercel.
5. Gere os hashes dos dois acessos com:

```bash
npm run create-admin -- administrador senha-forte admin
npm run create-admin -- packs senha-forte packs
```

6. No R2, configure CORS para uploads diretos:

```json
[
  {
    "AllowedOrigins": ["https://rogeriomessdj.com.br"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Para testar uploads em um Preview da Vercel, acrescente temporariamente a origem exata do Preview em `AllowedOrigins`. Não use `*` no bucket de produção.

7. Publique `cloudflare-worker.js` e vincule-o somente à rota `rogeriomessdj.com.br/packs*`. Defina `VERCEL_PACKS_ORIGIN` com a URL de produção do projeto Vercel.

Se o site também responder em `www.rogeriomessdj.com.br`, crie uma segunda rota `www.rogeriomessdj.com.br/packs*` para o mesmo Worker.

Os segredos R2, banco e sessão nunca devem ser enviados ao GitHub.
