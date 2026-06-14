function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

function sanitizeText_(value, maxLength) {
  var result = String(value || '').trim().replace(/\s+/g, ' ');
  if (maxLength) {
    return result.slice(0, maxLength);
  }
  return result;
}

function sanitizeEmail_(value) {
  return String(value || '').trim().toLowerCase().slice(0, 320);
}

function normalizeJsonArray_(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value) {
    try {
      var parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      return [];
    }
  }

  return [];
}

function normalizeBoolean_(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
}

function makeId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function getParam_(e, name) {
  if (!e || !e.parameter) {
    return '';
  }

  return String(e.parameter[name] || '').trim();
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(message, code) {
  return jsonResponse_({
    ok: false,
    message: message,
    code: code || 500
  });
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJsonStringify_(value) {
  return JSON.stringify(value || []);
}
