function doGet(e) {
  try {
    ensureAllSheets_();

    var action = getParam_(e, 'action') || 'health';
    if (action === 'lead') {
      var token = getParam_(e, 'token');
      if (!token) {
        return errorResponse_('Missing token', 400);
      }

      var snapshot = getLeadSnapshotByToken_(token);
      if (!snapshot) {
        return errorResponse_('Lead not found', 404);
      }

      return jsonResponse_({
        ok: true,
        lead: snapshot.lead,
        input: snapshot.input,
        result: snapshot.result,
        savedAt: snapshot.savedAt
      });
    }

    return jsonResponse_({
      ok: true,
      service: 'rapid4grad-mvp',
      version: 'phase-1',
      sheets: SHEET_NAMES
    });
  } catch (error) {
    return errorResponse_(error.message || 'Unknown error', 500);
  }
}

function doPost(e) {
  try {
    ensureAllSheets_();

    var data = parseJsonBody_(e);
    if (!data || data.type !== 'diagnosis_submission') {
      return errorResponse_('Unsupported payload', 400);
    }

    var snapshot = handleDiagnosisSubmission_(data);
    return jsonResponse_({
      ok: true,
      lead: snapshot.lead,
      input: snapshot.input,
      result: snapshot.result,
      savedAt: snapshot.savedAt
    });
  } catch (error) {
    return errorResponse_(error.message || 'Unknown error', 500);
  }
}
