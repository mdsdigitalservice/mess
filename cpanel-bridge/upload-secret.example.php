<?php
/**
 * Copie este arquivo para "upload-secret.php" e troque o valor abaixo por um
 * token forte gerado por você — por exemplo, rode no terminal:
 *
 *   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 *
 * Este arquivo tem que ficar UM NÍVEL ACIMA de public_html (ex:
 * /home/rogeriomessdj/upload-secret.php), nunca dentro dele — assim ele não
 * é acessível por URL de jeito nenhum, mesmo que o PHP pare de processar.
 *
 * O mesmo valor vai também na Vercel, como variável de ambiente
 * UPLOAD_BRIDGE_TOKEN (nunca commitado, nunca exposto ao navegador).
 */

define('UPLOAD_TOKEN', 'COLE_AQUI_O_TOKEN_GERADO');
