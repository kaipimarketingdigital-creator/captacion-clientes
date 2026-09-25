<?php
/**
 * submit.php — Kaipi Impulsa · Captación de clientes (página informativa)
 * Mismo sistema que /kaipimpulsa/submit.php: recibe el formulario de
 * cualificación en JSON, suscribe a Mailchimp (upsert vía PUT), registra el
 * lead en la MISMA hoja de Google Sheets, y devuelve JSON. Sin dependencias
 * externas (cURL nativo).
 *
 * Única diferencia con /kaipimpulsa/submit.php: añade el campo "origen"
 * (fijo, "pagina_informativa") para poder distinguir el lead en la hoja
 * compartida y aplica un tag adicional en Mailchimp con el mismo fin.
 *
 * Audiencia única de Mailchimp (MC_LIST_ID); la diferenciación entre
 * cualificados y no cualificados se hace por tag.
 */

// ----------------- CONFIG (idéntica a /kaipimpulsa/submit.php) -----------------
// MC_API_KEY vive en config.php (fuera de git) para que GitHub no bloquee el
// push por detectar la clave en texto plano. Súbelo por SFTP igual que este
// archivo — no se versiona.
require_once __DIR__ . '/config.php';
define('MC_SERVER_PREFIX',      'us4');
define('MC_LIST_ID',            '115720f5ef'); // audiencia única; se diferencia por tag
define('ALLOWED_ORIGIN',        'https://kaipimarketing.com');

// Mismo Web App de Google Apps Script que /kaipimpulsa/ (misma hoja de leads).
define('GSHEETS_WEBHOOK_URL',   'https://script.google.com/macros/s/AKfycbyI-eLP0FCyOI3WDtU9Nfa2mAVBsPhcFVrCgUD6Bdp56QBbE6710F0aFeXUguCqVPfp3g/exec');

// Origen fijo de este formulario (no configurable por el usuario).
define('LEAD_ORIGEN',           'pagina_informativa');

// ----------------- Cabeceras -----------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// ----------------- Helpers -----------------
function clean($value) {
    return trim(strip_tags(htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8')));
}

function fail($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// ----------------- Leer y validar payload -----------------
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    fail('Payload inválido', 400);
}

$email = isset($data['email']) ? trim($data['email']) : '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Email inválido', 400);
}

$nombre   = clean($data['nombre']   ?? '');
$negocio  = substr(clean($data['negocio'] ?? ''), 0, 255);
$freno    = clean($data['freno']    ?? '');
$fact_act = clean($data['fact_act'] ?? '');
$inv_pub  = clean($data['inv_pub']  ?? '');
$web      = clean($data['web']      ?? '');
$score    = (int) ($data['score'] ?? 0);
$qualified= !empty($data['qualified']);
$marketing= !empty($data['marketing_consent']);

// El origen SIEMPRE se fuerza al de este formulario, aunque el payload
// enviado desde el navegador incluya otro valor.
$origen = LEAD_ORIGEN;

// Parámetros UTM (capturados en el navegador y persistidos en sessionStorage).
$utm_source   = clean($data['utm_source']   ?? '');
$utm_medium   = clean($data['utm_medium']   ?? '');
$utm_campaign = clean($data['utm_campaign'] ?? '');
$utm_adset    = clean($data['utm_adset']    ?? '');
$utm_ad       = clean($data['utm_ad']       ?? '');
$utm_content  = clean($data['utm_content']  ?? '');

// ----------------- Guardar en Google Sheets (Apps Script) -----------------
// Se ejecuta ANTES de Mailchimp para que el lead quede registrado en la hoja
// aunque Mailchimp falle. No bloquea la respuesta: si el webhook falla,
// seguimos con el flujo normal.
function google_sheets_append($payload) {
    if (GSHEETS_WEBHOOK_URL === 'URL_APPS_SCRIPT_AQUI' || GSHEETS_WEBHOOK_URL === '') {
        return; // aún sin configurar
    }
    $ch = curl_init(GSHEETS_WEBHOOK_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION  => true, // Apps Script responde con un redirect 302
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_exec($ch);
    curl_close($ch);
    // Ignoramos el resultado a propósito: el registro en Sheets no debe
    // bloquear ni romper la experiencia del usuario.
}

google_sheets_append([
    'nombre'    => $nombre,
    'email'     => $email,
    'negocio'   => $negocio,
    'freno'     => $freno,
    'fact_act'  => $fact_act,
    'inv_pub'   => $inv_pub,
    'web'       => $web,
    'score'     => $score,
    'qualified' => $qualified,
    'origen'    => $origen,
    'utm_source'   => $utm_source,
    'utm_medium'   => $utm_medium,
    'utm_campaign' => $utm_campaign,
    'utm_adset'    => $utm_adset,
    'utm_ad'       => $utm_ad,
    'utm_content'  => $utm_content,
]);

// ----------------- Audiencia única -----------------
$list_id = MC_LIST_ID; // todos los leads a la misma lista; se diferencian por tag
$subscriber_hash = md5(strtolower($email));

// ----------------- Petición a Mailchimp (PUT = upsert) -----------------
function mailchimp_request($method, $path, $body = null) {
    $url = 'https://' . MC_SERVER_PREFIX . '.api.mailchimp.com/3.0/' . $path;
    $ch  = curl_init($url);

    $headers = [
        'Authorization: Basic ' . base64_encode('anystring:' . MC_API_KEY),
        'Content-Type: application/json',
    ];

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 15,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    return ['status' => $status, 'body' => $response, 'curl_error' => $err];
}

// NOTA: no se añade "origen" a merge_fields de Mailchimp porque ese campo no
// existe definido en la audiencia (Mailchimp rechaza merge fields no
// registrados). La distinción de origen se hace vía tag, más abajo, y vía
// columna "Origen" en Google Sheets.
$member_body = [
    'email_address' => $email,
    'status_if_new' => 'subscribed',
    'merge_fields'  => [
        'FNAME'    => $nombre,
        'NEGOCIO'  => substr($negocio, 0, 255),
        'FRENO'    => $freno,
        'FACT_ACT' => $fact_act,
        'INV_PUB'  => $inv_pub,
        'WEB'      => $web,
        'SCORE'    => (string) $score,
        'UTM_SRC'  => $utm_source,
        'UTM_MED'  => $utm_medium,
        'UTM_CAM'  => $utm_campaign,
        'UTM_ADT'  => $utm_adset,
        'UTM_AD'   => $utm_ad,
        'UTM_CON'  => $utm_content,
    ],
];

$res = mailchimp_request(
    'PUT',
    'lists/' . $list_id . '/members/' . $subscriber_hash,
    $member_body
);

if ($res['status'] < 200 || $res['status'] >= 300) {
    $detail = json_decode($res['body'], true);
    $msg = is_array($detail) && isset($detail['detail'])
        ? $detail['detail']
        : ($res['curl_error'] ?: 'Error al suscribir en Mailchimp');
    fail($msg, 500);
}

// ----------------- Tag de cualificación -----------------
// Todos van a la misma audiencia; el tag distingue el segmento.
$qual_tag = ($score >= 50) ? 'Cualificado' : 'No cualificado';
mailchimp_request(
    'POST',
    'lists/' . $list_id . '/members/' . $subscriber_hash . '/tags',
    ['tags' => [['name' => $qual_tag, 'status' => 'active']]]
);
// No bloqueamos por el resultado del tag; el alta principal ya se hizo.

// ----------------- Tag de origen (distingue esta landing en Mailchimp) -----------------
mailchimp_request(
    'POST',
    'lists/' . $list_id . '/members/' . $subscriber_hash . '/tags',
    ['tags' => [['name' => 'Origen: Página informativa', 'status' => 'active']]]
);
// No bloqueamos por el resultado del tag; el alta principal ya se hizo.

// ----------------- Tag de marketing (opcional) -----------------
if ($marketing) {
    mailchimp_request(
        'POST',
        'lists/' . $list_id . '/members/' . $subscriber_hash . '/tags',
        ['tags' => [['name' => 'marketing', 'status' => 'active']]]
    );
    // No bloqueamos por el resultado del tag; el alta principal ya se hizo.
}

// ----------------- Éxito -----------------
http_response_code(200);
echo json_encode(['success' => true]);
