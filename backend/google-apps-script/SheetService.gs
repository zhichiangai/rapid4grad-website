function ensureAllSheets_() {
  getOrCreateSheet_(SHEET_NAMES.leads, LEADS_HEADERS);
  getOrCreateSheet_(SHEET_NAMES.diagnoses, DIAGNOSES_HEADERS);
  getOrCreateSheet_(SHEET_NAMES.tasks, TASK_HEADERS);
  getOrCreateSheet_(SHEET_NAMES.emails, EMAIL_HEADERS);
  getOrCreateSheet_(SHEET_NAMES.riskAssessments, RISK_HEADERS);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function getOrCreateSheet_(sheetName, headers) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasAnyHeader = existing.some(function (value) {
    return value !== '';
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  var shouldRewrite = headers.some(function (header, index) {
    return existing[index] !== header;
  });

  if (shouldRewrite) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function appendRecord_(sheetName, headers, record) {
  var sheet = getOrCreateSheet_(sheetName, headers);
  var row = headers.map(function (header) {
    var value = record[header];
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  });

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function getRows_(sheetName, headers) {
  var sheet = getOrCreateSheet_(sheetName, headers);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row, index) {
    var record = {};
    headers.forEach(function (header, headerIndex) {
      record[header] = row[headerIndex];
    });
    record.__row = index + 2;
    return record;
  });
}

function findLeadRecordByToken_(token) {
  var rows = getRows_(SHEET_NAMES.leads, LEADS_HEADERS);
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i].access_token || '') === String(token || '')) {
      return rows[i];
    }
  }
  return null;
}

function findLatestDiagnosisByLeadId_(leadId) {
  var rows = getRows_(SHEET_NAMES.diagnoses, DIAGNOSES_HEADERS);
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i].lead_id || '') === String(leadId || '')) {
      return rows[i];
    }
  }
  return null;
}

function updateLeadRecord_(leadId, updates) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.leads, LEADS_HEADERS);
  var rows = getRows_(SHEET_NAMES.leads, LEADS_HEADERS);
  var target = null;

  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i].lead_id || '') === String(leadId || '')) {
      target = rows[i];
      break;
    }
  }

  if (!target) {
    return null;
  }

  var headerIndex = {};
  LEADS_HEADERS.forEach(function (header, index) {
    headerIndex[header] = index + 1;
  });

  Object.keys(updates).forEach(function (key) {
    if (!headerIndex[key]) {
      return;
    }

    var value = updates[key];
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    sheet.getRange(target.__row, headerIndex[key]).setValue(value);
  });

  return true;
}

function getLeadSnapshotByToken_(token) {
  var lead = findLeadRecordByToken_(token);
  if (!lead) {
    return null;
  }

  var diagnosis = null;
  if (lead.last_diagnosis_id) {
    var diagnoses = getRows_(SHEET_NAMES.diagnoses, DIAGNOSES_HEADERS);
    for (var i = diagnoses.length - 1; i >= 0; i -= 1) {
      if (String(diagnoses[i].diagnosis_id || '') === String(lead.last_diagnosis_id || '')) {
        diagnosis = diagnoses[i];
        break;
      }
    }
  }

  var input = lead.input_json ? JSON.parse(lead.input_json) : buildInputFromLeadRecord_(lead);
  var result = lead.result_json ? JSON.parse(lead.result_json) : (diagnosis && diagnosis.result_json ? JSON.parse(diagnosis.result_json) : null);

  if (!result) {
    return null;
  }

  return {
    lead: lead,
    input: input,
    result: result,
    savedAt: lead.updated_at || lead.created_at
  };
}

function buildInputFromLeadRecord_(lead) {
  return {
    name: lead.name || '',
    email: lead.email || '',
    school: lead.school || '',
    degree_type: lead.degree_type || 'master',
    current_year: lead.current_year || '',
    current_stage: lead.current_stage || 'writing',
    thesis_topic_status: lead.thesis_topic_status || 'vague',
    advisor_status: lead.advisor_status || 'seeking',
    meeting_frequency: lead.meeting_frequency || 'biweekly',
    writing_progress: lead.writing_progress || '26-50',
    submission_status: lead.submission_status || 'not_started',
    current_blocker: lead.current_blocker || '',
    lead_source: lead.lead_source || CONFIG.DEFAULT_LEAD_SOURCE
  };
}
