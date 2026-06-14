function sendDiagnosisEmails_(lead, result) {
  var emailStatuses = [];

  emailStatuses.push(sendEmailLog_({
    leadId: lead.lead_id,
    diagnosisId: lead.last_diagnosis_id,
    emailType: 'welcome',
    toEmail: lead.email,
    subject: CONFIG.WELCOME_EMAIL_SUBJECT,
    htmlBody: buildWelcomeEmailHtml_(lead, result),
    textBody: buildWelcomeEmailText_(lead, result)
  }));

  emailStatuses.push(sendEmailLog_({
    leadId: lead.lead_id,
    diagnosisId: lead.last_diagnosis_id,
    emailType: 'result_summary',
    toEmail: lead.email,
    subject: CONFIG.RESULT_EMAIL_SUBJECT,
    htmlBody: buildResultEmailHtml_(lead, result),
    textBody: buildResultEmailText_(lead, result)
  }));

  if (emailStatuses.indexOf('failed') !== -1) {
    return 'partial_failed';
  }

  return 'sent';
}

function sendEmailLog_(options) {
  var createdAt = new Date();
  var emailId = makeId_('email');
  var status = 'sent';
  var errorMessage = '';

  try {
    GmailApp.sendEmail(options.toEmail, options.subject, options.textBody, {
      htmlBody: options.htmlBody,
      name: CONFIG.APP_NAME
    });
  } catch (error) {
    status = 'failed';
    errorMessage = error.message || 'send failed';
  }

  appendRecord_(SHEET_NAMES.emails, EMAIL_HEADERS, {
    created_at: createdAt,
    email_id: emailId,
    lead_id: options.leadId,
    diagnosis_id: options.diagnosisId,
    email_type: options.emailType,
    to_email: options.toEmail,
    subject: options.subject,
    status: status,
    error_message: errorMessage
  });

  return status;
}

function buildWelcomeEmailHtml_(lead, result) {
  var dashboardUrl = buildAbsoluteSiteUrl_(result.dashboardUrl);
  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.8;color:#17212f">',
    '<p>' + escapeHtml_(lead.name) + ' 你好，</p>',
    '<p>你的診斷已建立，我們已經把結果整理好。接下來你可以先直接看 Dashboard，確認今天該做什麼。</p>',
    '<p><a href="' + dashboardUrl + '">前往 Dashboard</a></p>',
    '<p>目前風險：<strong>' + escapeHtml_(String(result.riskLevel).toUpperCase()) + '</strong>，分數：<strong>' + result.riskScore + '</strong></p>',
    '<p>如果你願意先往前走一步，接下來請先處理我們幫你排好的第一個任務。</p>',
    '</div>'
  ].join('');
}

function buildWelcomeEmailText_(lead, result) {
  var dashboardUrl = buildAbsoluteSiteUrl_(result.dashboardUrl);
  return [
    lead.name + ' 你好，',
    '',
    '你的診斷已建立，我們已經把結果整理好。',
    '前往 Dashboard：' + dashboardUrl,
    '目前風險：' + String(result.riskLevel).toUpperCase() + ' / ' + result.riskScore,
    '',
    '接下來先處理第一個任務。'
  ].join('\n');
}

function buildResultEmailHtml_(lead, result) {
  var dashboardUrl = buildAbsoluteSiteUrl_(result.dashboardUrl);
  var steps = result.nextSteps.map(function (step) {
    return '<li style="margin-bottom:8px;">' + escapeHtml_(step) + '</li>';
  }).join('');

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.8;color:#17212f">',
    '<p>' + escapeHtml_(lead.name) + ' 你好，這是你的結果摘要。</p>',
    '<p>' + escapeHtml_(result.summary) + '</p>',
    '<p><strong>下一步：</strong></p>',
    '<ol>' + steps + '</ol>',
    '<p><strong>Dashboard：</strong> <a href="' + dashboardUrl + '">' + dashboardUrl + '</a></p>',
    '</div>'
  ].join('');
}

function buildResultEmailText_(lead, result) {
  var dashboardUrl = buildAbsoluteSiteUrl_(result.dashboardUrl);
  return [
    lead.name + ' 你好，這是你的結果摘要。',
    result.summary,
    '',
    '下一步：',
    '1. ' + result.nextSteps[0],
    '2. ' + result.nextSteps[1],
    '3. ' + result.nextSteps[2],
    '',
    'Dashboard：' + dashboardUrl
  ].join('\n');
}
