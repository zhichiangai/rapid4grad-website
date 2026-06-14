function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(message, extra) {
  return jsonResponse(Object.assign({ ok: true, message: message || 'success' }, extra || {}));
}

function errorResponse(message, extra) {
  return jsonResponse(Object.assign({ ok: false, message: message || 'error' }, extra || {}));
}
