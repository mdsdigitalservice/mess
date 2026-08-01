# Bridge de upload (cPanel via PHP)

O painel admin roda na Vercel, mas os MP3s continuam salvos no cPanel
(`public_html/media/`, mesma pasta/URL que `sets.json` já usa). Este script
PHP é a ponte: a rota `/api/upload` do Next.js recebe o arquivo do navegador,
valida, e reenvia pra cá servidor-a-servidor.

## Onde colocar cada arquivo no servidor

```
/home/rogeriomessdj/
├── upload-secret.php        <- FORA do public_html (não é acessível por URL)
└── public_html/
    └── upload.php           <- este é o único arquivo público
```

1. Copie `upload-secret.example.php` → `upload-secret.php`, gere um token forte:
   ```bash
   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
   ```
   Cole o valor gerado dentro de `upload-secret.php`. Suba esse arquivo pra
   **`/home/rogeriomessdj/upload-secret.php`** (um nível acima de `public_html`,
   via File Manager ou SFTP).

2. Suba `upload.php` pra **`public_html/upload.php`**.

3. Guarde o mesmo token gerado no passo 1 — ele vai virar a variável de
   ambiente `UPLOAD_BRIDGE_TOKEN` no painel (Vercel).

## Limite de tamanho de upload no PHP

O PHP por padrão só aceita uploads pequenos (geralmente 2–8MB). Sets ao vivo
chegam a ~170MB, então é preciso aumentar o limite. Duas formas — tente a
primeira, se der erro 500 use a segunda:

**Opção A — `public_html/.htaccess`** (funciona se o PHP roda como mod_php):
```apache
php_value upload_max_filesize 250M
php_value post_max_size 260M
php_value max_execution_time 300
php_value max_input_time 300
```

**Opção B — cPanel → MultiPHP INI Editor** (necessário se o PHP roda via
php-fpm, que ignora `php_value` no `.htaccess`): selecione o domínio e defina
os mesmos quatro valores por lá.

## Testando manualmente

```bash
curl -X POST https://rogeriomessdj.com.br/upload.php \
  -H "X-Upload-Token: SEU_TOKEN_AQUI" \
  -F "title=Teste Bridge" \
  -F "file=@/caminho/para/um/teste.mp3"
```

Resposta esperada:
```json
{"ok":true,"filename":"teste-bridge-a1b2c3d4.mp3","url":"https://rogeriomessdj.com.br/media/teste-bridge-a1b2c3d4.mp3","size":12345}
```
