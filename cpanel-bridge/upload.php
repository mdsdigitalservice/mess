<?php
/**
 * Bridge de upload — recebe o MP3/WAV do painel Next.js (rodando na Vercel,
 * fora do cPanel) e grava fisicamente em public_html/media/, que já é a
 * pasta pública usada pelas URLs em sets.json (https://.../media/arquivo.mp3).
 *
 * Chamado sempre servidor-a-servidor pela rota /api/upload do painel — nunca
 * diretamente pelo navegador do admin. O token fica só nas duas pontas
 * (Vercel env var + upload-secret.php aqui) e nunca é exposto ao cliente.
 *
 * Onde colocar:
 *   public_html/upload.php          <- este arquivo
 *   upload-secret.php  (um nível ACIMA de public_html, fora do webroot)
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Método não permitido.');
}

// --- Segredo carregado de FORA do public_html — nunca fica exposto por HTTP,
// mesmo que o processamento de PHP falhe/seja desabilitado no futuro. ---
$secretFile = __DIR__ . '/../upload-secret.php';
if (!is_file($secretFile)) {
    error_log('upload.php: upload-secret.php não encontrado (esperado um nível acima de public_html).');
    fail(500, 'Upload não configurado no servidor.');
}
require $secretFile;

if (!defined('UPLOAD_TOKEN') || UPLOAD_TOKEN === '') {
    error_log('upload.php: UPLOAD_TOKEN não definido em upload-secret.php.');
    fail(500, 'Upload não configurado no servidor.');
}

// --- Autenticação por token, comparação resistente a timing attack ---
$providedToken = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $providedToken)) {
    fail(401, 'Token inválido.');
}

// --- Configuração ---
$MEDIA_DIR = __DIR__ . '/media';
$PUBLIC_BASE_URL = 'https://rogeriomessdj.com.br/media/';
$MAX_BYTES = 250 * 1024 * 1024; // 250MB — sets ao vivo chegam perto de 170MB
$ALLOWED_EXT = ['mp3', 'wav'];

// --- Arquivo presente e sem erro de upload? ---
if (!isset($_FILES['file'])) {
    fail(400, 'Arquivo ausente.');
}
if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    fail(400, 'Falha no upload (código ' . $_FILES['file']['error'] . '). Verifique upload_max_filesize/post_max_size no PHP.');
}

$tmpPath = $_FILES['file']['tmp_name'];
$size = (int) $_FILES['file']['size'];

if (!is_uploaded_file($tmpPath)) {
    fail(400, 'Upload inválido.');
}
if ($size <= 0 || $size > $MAX_BYTES) {
    fail(400, 'Tamanho de arquivo inválido (máx ' . intdiv($MAX_BYTES, 1024 * 1024) . 'MB).');
}

// --- Extensão declarada pelo cliente só decide QUAL validação de conteúdo
// aplicar — o nome em si nunca é usado para montar o caminho final. ---
$clientName = (string) ($_FILES['file']['name'] ?? '');
$ext = strtolower(pathinfo($clientName, PATHINFO_EXTENSION));
if (!in_array($ext, $ALLOWED_EXT, true)) {
    fail(400, 'Extensão não permitida. Use .mp3 ou .wav.');
}

// --- Valida o CONTEÚDO real do arquivo (magic bytes) — nunca confia em nome
// ou Content-Type enviados pelo cliente. ---
function looksLikeAudio(string $path, string $ext): bool {
    $handle = fopen($path, 'rb');
    if (!$handle) {
        return false;
    }
    $head = fread($handle, 12);
    fclose($handle);
    if ($head === false || strlen($head) < 4) {
        return false;
    }

    if ($ext === 'mp3') {
        if (substr($head, 0, 3) === 'ID3') {
            return true; // tag ID3v2
        }
        // frame sync do MPEG: 11 bits em 1 (0xFF seguido de 0xE0..0xFF)
        return ord($head[0]) === 0xFF && (ord($head[1]) & 0xE0) === 0xE0;
    }

    if ($ext === 'wav') {
        return substr($head, 0, 4) === 'RIFF' && strlen($head) >= 12 && substr($head, 8, 4) === 'WAVE';
    }

    return false;
}

if (!looksLikeAudio($tmpPath, $ext)) {
    fail(400, 'O conteúdo do arquivo não parece ser um áudio ' . strtoupper($ext) . ' válido.');
}

// Segunda camada de checagem via fileinfo, quando disponível no servidor.
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? finfo_file($finfo, $tmpPath) : false;
    if ($finfo) {
        finfo_close($finfo);
    }
    $allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];
    if ($mime !== false && !in_array($mime, $allowedMimes, true)) {
        fail(400, "Tipo de arquivo inválido detectado ($mime).");
    }
}

// --- Nome final é sempre gerado pelo servidor (slug + sufixo aleatório) —
// isso por si só já elimina qualquer risco de path traversal via nome de
// arquivo do cliente. ---
function slugify(string $text): string {
    // Mapa manual em vez de iconv('...//TRANSLIT'): o resultado do TRANSLIT
    // varia por locale/build do servidor (em teste, "ção" virou "c~ao" em vez
    // de "cao") — isso garante o mesmo resultado em qualquer servidor.
    // Maiúscula e minúscula no mapa — de propósito não depende de mbstring
    // (nem toda instalação PHP tem a extensão habilitada).
    static $map = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'Á' => 'a', 'À' => 'a', 'Â' => 'a', 'Ã' => 'a', 'Ä' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'É' => 'e', 'È' => 'e', 'Ê' => 'e', 'Ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'Í' => 'i', 'Ì' => 'i', 'Î' => 'i', 'Ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'Ó' => 'o', 'Ò' => 'o', 'Ô' => 'o', 'Õ' => 'o', 'Ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
        'Ú' => 'u', 'Ù' => 'u', 'Û' => 'u', 'Ü' => 'u',
        'ç' => 'c', 'Ç' => 'c', 'ñ' => 'n', 'Ñ' => 'n', 'ý' => 'y', 'Ý' => 'y',
    ];
    $ascii = strtolower(strtr($text, $map));
    $ascii = preg_replace('/[^a-z0-9]+/', '-', $ascii) ?? '';
    $ascii = trim($ascii, '-');
    $ascii = substr($ascii, 0, 80);
    return $ascii !== '' ? $ascii : 'faixa';
}

$titleParam = isset($_POST['title']) ? (string) $_POST['title'] : 'faixa';
$slug = slugify($titleParam);

if (!is_dir($MEDIA_DIR) && !mkdir($MEDIA_DIR, 0755, true) && !is_dir($MEDIA_DIR)) {
    fail(500, 'Não foi possível preparar a pasta de destino.');
}

$realMediaDir = realpath($MEDIA_DIR);
if ($realMediaDir === false) {
    fail(500, 'Pasta de destino inválida.');
}

// Sufixo aleatório evita colisão de nome; se por acaso colidir, tenta de novo.
$safeName = null;
for ($attempt = 0; $attempt < 5; $attempt++) {
    $candidate = $slug . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
    $candidatePath = $realMediaDir . DIRECTORY_SEPARATOR . $candidate;
    if (!file_exists($candidatePath)) {
        $safeName = $candidate;
        $destPath = $candidatePath;
        break;
    }
}
if ($safeName === null) {
    fail(500, 'Não foi possível gerar um nome de arquivo único.');
}

// Defesa em profundidade: confirma que o destino final continua dentro de
// MEDIA_DIR, mesmo o nome sendo 100% gerado por nós.
if (strpos($destPath, $realMediaDir . DIRECTORY_SEPARATOR) !== 0) {
    fail(400, 'Caminho de destino inválido.');
}

if (!move_uploaded_file($tmpPath, $destPath)) {
    fail(500, 'Falha ao salvar o arquivo no servidor.');
}
chmod($destPath, 0644);

echo json_encode([
    'ok' => true,
    'filename' => $safeName,
    'url' => $PUBLIC_BASE_URL . rawurlencode($safeName),
    'size' => $size,
], JSON_UNESCAPED_UNICODE);
