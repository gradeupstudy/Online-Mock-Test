import { Attempt, Test } from '../types';

export interface PrintMeritListOptions {
  test?: Test | null;
  toppers: Attempt[];
  topCount: number;
  totalAppeared: number;
}

export function printOfficialMeritList({
  test,
  toppers,
  topCount,
  totalAppeared
}: PrintMeritListOptions) {
  const testTitle = test?.title || 'Mock Examination Assessment';
  const testSubject = test?.subject || test?.category || 'General Examination';
  const testCode = test?.exam_code || test?.test_code || 'GUS-MOCK';
  const totalQuestions = test?.total_questions || (toppers[0]?.total_questions) || 100;
  const totalMarks = test?.total_marks || (totalQuestions * (test?.marks_per_question || 1));
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const displayList = toppers.slice(0, topCount);
  const rank1 = displayList[0] || null;
  const rank2 = displayList[1] || null;
  const rank3 = displayList[2] || null;

  // Calculate statistics
  const scores = displayList.map(a => a.score || 0);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '0';
  const passMarks = test?.passing_marks || (totalMarks * 0.4);
  const qualifiedCount = displayList.filter(a => (a.score || 0) >= passMarks).length;
  const qualRate = displayList.length > 0 ? Math.round((qualifiedCount / displayList.length) * 100) : 0;

  // Retrieve custom logo if set
  let brandLogoHtml = '<div class="brand-logo-badge">🎓</div>';
  try {
    const rawSettings = localStorage.getItem('gradeup_admin_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.logo_url && parsed.logo_url !== '/logo.png' && parsed.logo_url !== '/logo.svg') {
        brandLogoHtml = `<img src="${parsed.logo_url}" alt="Logo" style="height: 44px; max-width: 120px; object-fit: contain; border-radius: 8px;" />`;
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
  <title>Top ${topCount} Merit List - ${testTitle} - Gradeup Study</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
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
      font-size: 11px;
      line-height: 1.4;
    }
    .merit-container {
      border: 2px solid #1e3a8a;
      border-radius: 12px;
      padding: 16px 20px;
      position: relative;
      background: #ffffff;
    }
    
    /* Header Banner */
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-badge {
      width: 46px;
      height: 46px;
      background: #1e3a8a;
      color: #ffffff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      border: 2px solid #3b82f6;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-top: 1px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-pill {
      display: inline-block;
      padding: 2px 8px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .gold-badge-pill {
      display: inline-block;
      padding: 2px 8px;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .exam-meta-box {
      text-align: right;
      background: #f8fafc;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .exam-meta-title {
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0;
    }
    .exam-meta-sub {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Podium Row */
    .podium-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .podium-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .podium-gold {
      background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
      border-color: #f59e0b;
      box-shadow: 0 2px 4px rgba(245, 158, 11, 0.15);
    }
    .podium-silver {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-color: #94a3b8;
    }
    .podium-bronze {
      background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
      border-color: #f97316;
    }
    .podium-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .podium-rank-tag {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .tag-gold { background: #fde68a; color: #78350f; }
    .tag-silver { background: #e2e8f0; color: #334155; }
    .tag-bronze { background: #fed7aa; color: #7c2d12; }
    
    .podium-name {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .podium-location {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .podium-score-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .podium-score-val {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }
    .podium-percent-val {
      font-size: 12px;
      font-weight: 800;
      color: #2563eb;
    }

    /* Stats Quick Bar */
    .kpi-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 12px;
      text-align: center;
    }
    .kpi-item-val {
      font-size: 13px;
      font-weight: 900;
      color: #1e3a8a;
    }
    .kpi-item-lbl {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }

    /* Merit List Table */
    .merit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 12px;
    }
    .merit-table th {
      background: #1e3a8a;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.3px;
    }
    .merit-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .merit-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .merit-table tr.top1-row {
      background: #fefce8 !important;
      font-weight: 700;
    }
    .merit-table tr.top2-row {
      background: #f1f5f9 !important;
      font-weight: 700;
    }
    .merit-table tr.top3-row {
      background: #fff7ed !important;
      font-weight: 700;
    }
    .rank-cell {
      font-weight: 900;
      text-align: center;
      width: 42px;
    }
    .score-cell {
      font-weight: 900;
      text-align: right;
      color: #0f172a;
    }
    .percent-cell {
      font-weight: 800;
      text-align: right;
      color: #2563eb;
    }
    .center-cell {
      text-align: center;
    }

    /* Footer */
    .footer-bar {
      border-top: 1.5px solid #1e3a8a;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
    .verified-seal {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9px;
    }
  </style>
</head>
<body>

<div class="merit-container">
  
  <!-- HEADER -->
  <div class="header-banner">
    <div class="brand-section">
      ${brandLogoHtml}
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h1 class="brand-title">GRADEUP STUDY</h1>
          <span class="gold-badge-pill">★ Official Merit List ★</span>
        </div>
        <div class="brand-subtitle">
          <span>State Examination Assessment Board</span>
          <span>•</span>
          <span class="badge-pill">Top ${topCount} Rankers Podium</span>
        </div>
      </div>
    </div>

    <div class="exam-meta-box">
      <div class="exam-meta-title">${testTitle}</div>
      <div class="exam-meta-sub">Subject: <strong>${testSubject}</strong> | Date: <strong>${currentDate}</strong></div>
      <div class="exam-meta-sub">Code: <strong>${testCode}</strong> | Total Appeared: <strong>${totalAppeared} Aspirants</strong></div>
    </div>
  </div>

  ${displayList.length === 0 ? `
    <div style="text-align: center; padding: 40px; color: #64748b;">
      <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">No completed candidate attempts found for this test.</h3>
      <p style="font-size: 11px;">Rankings and podium scorecards will be computed automatically as aspirants submit mock exams.</p>
    </div>
  ` : `

  <!-- TOP 3 PODIUM -->
  <div class="podium-grid">
    
    <!-- 🥈 RANK 2 (Silver) -->
    <div class="podium-card podium-silver">
      <div>
        <div class="podium-header">
          <span style="font-size: 18px;">🥈</span>
          <span class="podium-rank-tag tag-silver">Rank 2 (Silver)</span>
        </div>
        ${rank2 ? `
          <div class="podium-name">${rank2.student_name}</div>
          <div class="podium-location">📍 ${rank2.student_district || 'Himachal'}, ${rank2.student_state || 'HP'}</div>
        ` : `
          <div class="podium-name" style="color: #94a3b8; font-style: italic;">Position Vacant</div>
          <div class="podium-location">-</div>
        `}
      </div>
      ${rank2 ? `
        <div class="podium-score-row">
          <div>
            <span style="font-size: 9px; color: #64748b; font-weight: bold; display: block;">SCORE</span>
            <span class="podium-score-val">${rank2.score} / ${totalMarks}</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; display: block;">ACCURACY</span>
            <span class="podium-percent-val">${rank2.percentage}%</span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- 🥇 RANK 1 (Gold Champion) -->
    <div class="podium-card podium-gold" style="transform: scale(1.02);">
      <div>
        <div class="podium-header">
          <span style="font-size: 22px;">🥇</span>
          <span class="podium-rank-tag tag-gold">★ 1st Topper (Gold) ★</span>
        </div>
        ${rank1 ? `
          <div class="podium-name" style="font-size: 14px; color: #78350f;">${rank1.student_name}</div>
          <div class="podium-location" style="color: #92400e; font-weight: 700;">📍 ${rank1.student_district || 'Himachal'}, ${rank1.student_state || 'HP'}</div>
        ` : `
          <div class="podium-name" style="color: #94a3b8; font-style: italic;">Position Vacant</div>
          <div class="podium-location">-</div>
        `}
      </div>
      ${rank1 ? `
        <div class="podium-score-row" style="background: rgba(255,255,255,0.95); border: 1px solid #fcd34d;">
          <div>
            <span style="font-size: 9px; color: #92400e; font-weight: bold; display: block;">TOP SCORE</span>
            <span class="podium-score-val" style="color: #78350f; font-size: 14px;">${rank1.score} / ${totalMarks}</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9px; color: #92400e; font-weight: bold; display: block;">PERCENTAGE</span>
            <span class="podium-percent-val" style="color: #15803d; font-size: 13px;">${rank1.percentage}%</span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- 🥉 RANK 3 (Bronze) -->
    <div class="podium-card podium-bronze">
      <div>
        <div class="podium-header">
          <span style="font-size: 18px;">🥉</span>
          <span class="podium-rank-tag tag-bronze">Rank 3 (Bronze)</span>
        </div>
        ${rank3 ? `
          <div class="podium-name">${rank3.student_name}</div>
          <div class="podium-location">📍 ${rank3.student_district || 'Himachal'}, ${rank3.student_state || 'HP'}</div>
        ` : `
          <div class="podium-name" style="color: #94a3b8; font-style: italic;">Position Vacant</div>
          <div class="podium-location">-</div>
        `}
      </div>
      ${rank3 ? `
        <div class="podium-score-row">
          <div>
            <span style="font-size: 9px; color: #64748b; font-weight: bold; display: block;">SCORE</span>
            <span class="podium-score-val">${rank3.score} / ${totalMarks}</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; display: block;">ACCURACY</span>
            <span class="podium-percent-val">${rank3.percentage}%</span>
          </div>
        </div>
      ` : ''}
    </div>

  </div>

  <!-- KPI SUMMARY BAR -->
  <div class="kpi-bar">
    <div>
      <div class="kpi-item-val">${highestScore} / ${totalMarks}</div>
      <div class="kpi-item-lbl">Highest Score</div>
    </div>
    <div>
      <div class="kpi-item-val">${avgScore}</div>
      <div class="kpi-item-lbl">Average Score</div>
    </div>
    <div>
      <div class="kpi-item-val">${displayList.length} / ${totalAppeared}</div>
      <div class="kpi-item-lbl">Rankers Evaluated</div>
    </div>
    <div>
      <div class="kpi-item-val">${qualRate}%</div>
      <div class="kpi-item-lbl">Top Cohort Pass Rate</div>
    </div>
  </div>

  <!-- ROLL OF MERIT TABLE -->
  <table class="merit-table">
    <thead>
      <tr>
        <th class="rank-cell">Rank</th>
        <th>Candidate Name</th>
        <th>District & State</th>
        <th class="center-cell">Correct / Wrong</th>
        <th class="center-cell">Time Taken</th>
        <th style="text-align: right;">Score</th>
        <th style="text-align: right;">Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${displayList.map((att, idx) => {
        const rankNum = idx + 1;
        let rankTag = `#${rankNum}`;
        let rowCls = '';
        if (rankNum === 1) { rankTag = '🥇 1'; rowCls = 'top1-row'; }
        else if (rankNum === 2) { rankTag = '🥈 2'; rowCls = 'top2-row'; }
        else if (rankNum === 3) { rankTag = '🥉 3'; rowCls = 'top3-row'; }

        const mins = Math.floor((att.time_taken_seconds || 0) / 60);
        const secs = (att.time_taken_seconds || 0) % 60;

        return `
          <tr class="${rowCls}">
            <td class="rank-cell">${rankTag}</td>
            <td style="font-weight: 700; color: #0f172a;">${att.student_name}</td>
            <td style="color: #475569;">${att.student_district ? `${att.student_district}, ` : ''}${att.student_state || 'HP'}</td>
            <td class="center-cell" style="font-weight: 600;">
              <span style="color: #15803d;">✓ ${att.correct_answers}</span>
              <span style="color: #cbd5e1; margin: 0 4px;">|</span>
              <span style="color: #dc2626;">✗ ${att.wrong_answers}</span>
            </td>
            <td class="center-cell" style="color: #64748b;">${mins}m ${secs}s</td>
            <td class="score-cell">${att.score}</td>
            <td class="percent-cell">${att.percentage}%</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  `}

  <!-- FOOTER -->
  <div class="footer-bar">
    <div>
      <strong>Gradeup Study Online Assessment System</strong> • Comprehensive State Recruitment Mock Portal
      <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">
        Evaluated strictly as per standardized negative marking guidelines (${test?.negative_marking ? `-${test.negative_marking}/wrong` : 'No negative'}).
      </div>
    </div>

    <div class="verified-seal">
      <span>✓ Verified Score Transcripts</span>
    </div>
  </div>

</div>

</body>
</html>
  `;

  // Create isolated hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(printHtml);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };
}
