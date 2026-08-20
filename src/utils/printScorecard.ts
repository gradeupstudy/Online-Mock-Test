import { Attempt, Test } from '../types';

export function printOfficialScorecard({
  attempt,
  test,
  rank = 1,
  totalCandidates = 1
}: {
  attempt: Attempt;
  test?: Test | null;
  rank?: number;
  totalCandidates?: number;
}) {
  const totalQuestions = attempt.total_questions || test?.total_questions || ((attempt.correct_answers || 0) + (attempt.wrong_answers || 0) + (attempt.unattempted_answers || attempt.skipped_questions || 0)) || 1;
  const correctCount = attempt.correct_answers || 0;
  const wrongCount = attempt.wrong_answers || 0;
  const unattemptedCount = attempt.unattempted_answers ?? attempt.skipped_questions ?? Math.max(0, totalQuestions - (attempt.attempted_questions || (correctCount + wrongCount)));
  const attemptedCount = attempt.attempted_questions ?? (correctCount + wrongCount);
  
  const testTitle = test?.title || 'Mock Test Assessment';
  const testSubject = test?.subject || test?.category || 'General Assessment';
  const totalMarks = test?.total_marks || (totalQuestions * (test?.marks_per_question || 1));
  const negativeMarking = test?.negative_marking ?? 0.25;
  const marksPerQuestion = test?.marks_per_question ?? 1;
  
  const timeMins = Math.floor(attempt.time_taken_seconds / 60);
  const timeSecs = attempt.time_taken_seconds % 60;
  const formattedTime = `${timeMins} min${timeMins !== 1 ? 's' : ''} ${timeSecs} sec${timeSecs !== 1 ? 's' : ''}`;
  
  const avgSpeed = attemptedCount > 0 ? (attempt.time_taken_seconds / attemptedCount).toFixed(1) : '0';
  const accuracy = attemptedCount > 0 ? ((correctCount / attemptedCount) * 100).toFixed(1) : '0';
  const scorePercent = attempt.percentage !== undefined ? attempt.percentage : (totalMarks > 0 ? ((attempt.score / totalMarks) * 100).toFixed(1) : '0');
  const attemptDate = attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleDateString('en-IN');

  const reportId = `GUS-${(attempt.id || 'SCORE').slice(0, 8).toUpperCase()}`;
  const isPassed = Number(scorePercent) >= (test?.passing_marks ? (test.passing_marks / totalMarks) * 100 : 40);

  // Retrieve logo from localStorage if set
  let brandLogoHtml = '<div class="brand-logo-badge">GS</div>';
  try {
    const rawSettings = localStorage.getItem('gradeup_admin_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.logo_url && parsed.logo_url !== '/logo.png' && parsed.logo_url !== '/logo.svg') {
        brandLogoHtml = `<img src="${parsed.logo_url}" alt="Logo" style="height: 48px; max-width: 130px; object-fit: contain; border-radius: 8px;" />`;
      }
    }
  } catch (e) {
    // fallback
  }

  const printHtml = `

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Scorecard - ${attempt.student_name} - Gradeup Study</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.4;
    }
    .scorecard-card {
      border: 2px solid #1e3a8a;
      border-radius: 16px;
      padding: 24px 28px;
      position: relative;
      background: #ffffff;
      box-shadow: none;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo-badge {
      width: 52px;
      height: 52px;
      background: #1e3a8a;
      color: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 900;
      color: #1e3a8a;
      margin: 0;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
    }
    .report-title-badge {
      display: inline-block;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-id {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      margin-top: 5px;
      font-family: monospace;
    }
    
    /* CANDIDATE & TEST INFO */
    .info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .info-col h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      margin: 0 0 8px 0;
      font-weight: 800;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .info-label {
      width: 95px;
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
    }
    .info-value {
      color: #0f172a;
      font-weight: 700;
    }
    
    /* KEY STATS HIGHLIGHT BAR */
    .kpi-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 10px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-card.rank-card {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .kpi-card.score-card {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .kpi-card.percent-card {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .kpi-card.status-card {
      background: #f8fafc;
      border-color: #e2e8f0;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 3px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    
    /* DETAILED PERFORMANCE TABLE */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      margin: 18px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    table.perf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    table.perf-table th {
      background: #1e3a8a;
      color: #ffffff;
      text-align: left;
      padding: 8px 12px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.perf-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
    }
    table.perf-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .badge-primary { background: #dbeafe; color: #1e40af; }

    /* FOOTER & SEAL */
    .footer-section {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .disclaimer-box {
      font-size: 10px;
      color: #64748b;
      max-width: 360px;
      line-height: 1.3;
    }
    .seal-box {
      text-align: center;
      border: 2px dashed #94a3b8;
      border-radius: 12px;
      padding: 8px 16px;
      background: #f8fafc;
    }
    .seal-title {
      font-size: 10px;
      font-weight: 900;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .seal-sub {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="scorecard-card">
    
    <!-- HEADER -->
    <div class="header-banner">
      <div class="brand-section">
        ${brandLogoHtml}
        <div>
          <h1 class="brand-name">Gradeup Study</h1>
          <div class="brand-sub">Official Online Examination & Assessment System</div>
        </div>
      </div>
      <div class="report-meta">
        <div class="report-title-badge">Official Candidate Scorecard</div>
        <div class="report-id">${reportId}</div>
      </div>
    </div>

    <!-- CANDIDATE & TEST INFO -->
    <div class="info-grid">
      <div class="info-col">
        <h3>Candidate Particulars</h3>
        <div class="info-row">
          <span class="info-label">Candidate:</span>
          <span class="info-value" style="font-size: 14px; color: #1e3a8a;">${attempt.student_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Mobile No:</span>
          <span class="info-value">${attempt.student_mobile}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${attempt.student_email || 'Not Provided'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${attempt.student_district ? `${attempt.student_district}, ` : ''}${attempt.student_state}</span>
        </div>
      </div>

      <div class="info-col">
        <h3>Examination Details</h3>
        <div class="info-row">
          <span class="info-label">Mock Test:</span>
          <span class="info-value">${testTitle}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Subject:</span>
          <span class="info-value">${testSubject}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Exam Date:</span>
          <span class="info-value">${attemptDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Taken:</span>
          <span class="info-value">${formattedTime}</span>
        </div>
      </div>
    </div>

    <!-- KEY PERFORMANCE TILES -->
    <div class="kpi-container">
      <div class="kpi-card rank-card">
        <div class="kpi-value" style="color: #b45309;">#${rank}</div>
        <div class="kpi-label">Merit Rank</div>
      </div>

      <div class="kpi-card score-card">
        <div class="kpi-value" style="color: #15803d;">${Number(attempt.score).toFixed(2)} <span style="font-size: 12px; color: #64748b;">/ ${Number(totalMarks).toFixed(2)}</span></div>
        <div class="kpi-label">Marks Obtained</div>
      </div>

      <div class="kpi-card percent-card">
        <div class="kpi-value" style="color: #1d4ed8;">${Number(scorePercent).toFixed(2)}%</div>
        <div class="kpi-label">Percentage Score</div>
      </div>

      <div class="kpi-card status-card">
        <div class="kpi-value" style="font-size: 16px; margin-top: 4px; color: ${isPassed ? '#15803d' : '#b45309'};">
          ${isPassed ? 'QUALIFIED' : 'COMPLETED'}
        </div>
        <div class="kpi-label">Status</div>
      </div>
    </div>

    <!-- PERFORMANCE BREAKDOWN TABLE -->
    <div class="section-title">
      📊 Question & Score Analytics Breakdown
    </div>
    <table class="perf-table">
      <thead>
        <tr>
          <th>Evaluation Metric</th>
          <th style="text-align: center;">Count / Value</th>
          <th style="text-align: center;">Impact / Remarks</th>
          <th style="text-align: right;">Score Contribution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Questions in Test</td>
          <td style="text-align: center; font-weight: 700;">${totalQuestions}</td>
          <td style="text-align: center;"><span class="badge badge-neutral">Standard</span></td>
          <td style="text-align: right;">${Number(totalMarks).toFixed(2)} Max Marks</td>
        </tr>
        <tr>
          <td>Questions Attempted</td>
          <td style="text-align: center; font-weight: 700;">${attemptedCount}</td>
          <td style="text-align: center;"><span class="badge badge-primary">${Math.round((attemptedCount / totalQuestions) * 100)}% Attempt Rate</span></td>
          <td style="text-align: right;">—</td>
        </tr>
        <tr>
          <td>Correct Answers</td>
          <td style="text-align: center; font-weight: 700; color: #15803d;">${correctCount}</td>
          <td style="text-align: center;"><span class="badge badge-success">+${marksPerQuestion} Mark Each</span></td>
          <td style="text-align: right; color: #15803d; font-weight: 700;">+${(correctCount * marksPerQuestion).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Wrong / Negative Answers</td>
          <td style="text-align: center; font-weight: 700; color: #dc2626;">${wrongCount}</td>
          <td style="text-align: center;"><span class="badge badge-danger">-${negativeMarking} Penalty</span></td>
          <td style="text-align: right; color: #dc2626; font-weight: 700;">-${(wrongCount * negativeMarking).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Unattempted / Skipped</td>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${unattemptedCount}</td>
          <td style="text-align: center;"><span class="badge badge-neutral">0 Penalty</span></td>
          <td style="text-align: right; color: #64748b;">0.00</td>
        </tr>
        <tr style="background: #f1f5f9; font-weight: 800;">
          <td style="color: #1e3a8a;">NET FINAL SCORE</td>
          <td style="text-align: center; color: #1e3a8a; font-size: 13px;">${attempt.score}</td>
          <td style="text-align: center;"><span class="badge badge-success">Accuracy: ${accuracy}%</span></td>
          <td style="text-align: right; color: #1e3a8a; font-size: 14px;">${Number(attempt.score).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- FOOTER & AUTHENTICATION -->
    <div class="footer-section">
      <div class="disclaimer-box">
        <strong>Digital Verification Notice:</strong> This document is an electronically generated official scorecard issued by Gradeup Study's Examination Assessment Engine. Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
      </div>
      <div class="seal-box">
        <div class="seal-title">GRADEUP STUDY</div>
        <div class="seal-sub">VERIFIED ASSESSMENT SEAL</div>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>
`;

  // Create an isolated hidden iframe for printing to prevent any background duplicate printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('title', 'Scorecard Print Frame');
  
  document.body.appendChild(iframe);
  
  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();
    
    // Auto cleanup after print window closes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  }
}
