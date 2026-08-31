import { Attempt, Test } from '../types';

export interface ScorecardImageOptions {
  attempt: Attempt;
  test?: Test | null;
  rank?: number;
  totalCandidates?: number;
  brandName?: string;
  logoUrl?: string;
  shareUrl?: string;
}

/**
 * Generates a high-resolution, branded PNG scorecard image on an HTML5 Canvas.
 * STRICT PRIVACY: Mobile numbers and email addresses are NEVER drawn on the image.
 */
export async function generateScorecardImageBlob(options: ScorecardImageOptions): Promise<{
  blob: Blob;
  dataUrl: string;
  file: File;
}> {
  const {
    attempt,
    test,
    rank = 1,
    totalCandidates = 1,
    brandName = 'Gradeup Study',
    logoUrl,
    shareUrl = window.location.origin
  } = options;

  // Setup Canvas Dimensions (High-DPI 1080x1080 for Instagram/WhatsApp/Telegram perfection)
  const width = 1080;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Helper: Draw Rounded Rectangle
  const roundRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill = true,
    stroke = false
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // 1. BACKGROUND GRADIENT (Deep Sapphire/Slate Theme)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.45, '#0f172a');
  bgGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow circles
  const radialGlow1 = ctx.createRadialGradient(200, 150, 20, 200, 150, 400);
  radialGlow1.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  radialGlow1.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = radialGlow1;
  ctx.fillRect(0, 0, width, height);

  const radialGlow2 = ctx.createRadialGradient(900, 800, 20, 900, 800, 450);
  radialGlow2.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
  radialGlow2.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = radialGlow2;
  ctx.fillRect(0, 0, width, height);

  // Outer Border Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 3;
  roundRect(24, 24, width - 48, height - 48, 36, false, true);

  // 2. HEADER TOP BAR (Brand Identity)
  let logoDrawn = false;
  if (logoUrl && !logoUrl.startsWith('/logo.')) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = logoUrl;
      });
      const logoAspect = img.width / img.height;
      const logoH = 54;
      const logoW = Math.min(180, logoH * logoAspect);
      ctx.drawImage(img, 60, 60, logoW, logoH);
      logoDrawn = true;
    } catch {
      // fallback to vector branding
    }
  }

  if (!logoDrawn) {
    // Vector Emblem Badge
    const emblemGrad = ctx.createLinearGradient(60, 60, 114, 114);
    emblemGrad.addColorStop(0, '#ef4444');
    emblemGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = emblemGrad;
    roundRect(60, 58, 54, 54, 16, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GS', 87, 85);

    // Brand Name Text
    ctx.textAlign = 'left';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(brandName.toUpperCase(), 128, 85);
  }

  // "OFFICIAL SCORECARD" Top Right Badge
  ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(width - 320, 58, 260, 48, 24, true, true);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OFFICIAL SCORECARD', width - 190, 82);

  // 3. MAIN SCORECARD CONTAINER
  const cardX = 60;
  const cardY = 145;
  const cardW = width - 120;
  const cardH = height - 265;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 2;
  roundRect(cardX, cardY, cardW, cardH, 32, true, true);

  // Top Tags in Card
  let tagX = cardX + 32;
  const tagY = cardY + 32;

  // Category Tag
  const categoryText = test?.category || 'Competitive Exam';
  ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const catWidth = ctx.measureText(categoryText).width + 24;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  roundRect(tagX, tagY, catWidth, 32, 10, true, true);
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(categoryText, tagX + 12, tagY + 16);
  tagX += catWidth + 12;

  // Subject Tag
  if (test?.subject) {
    const subjText = `Subject: ${test.subject}`;
    const subjWidth = ctx.measureText(subjText).width + 24;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
    roundRect(tagX, tagY, subjWidth, 32, 10, true, true);
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText(subjText, tagX + 12, tagY + 16);
    tagX += subjWidth + 12;
  }

  // Submitted Successfully Tag
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
  roundRect(cardX + cardW - 220, tagY, 188, 32, 10, true, true);
  ctx.fillStyle = '#34d399';
  ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓ Verified Submission', cardX + cardW - 126, tagY + 16);

  // Test Title (Supports Hindi Devanagari & English)
  const testTitle = test?.title || 'Comprehensive Mock Assessment';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Truncate long title gracefully
  let displayTitle = testTitle;
  if (ctx.measureText(displayTitle).width > cardW - 64) {
    while (ctx.measureText(displayTitle + '...').width > cardW - 64 && displayTitle.length > 5) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '...';
  }
  ctx.fillText(displayTitle, cardX + 32, cardY + 84);

  // Aspirant Profile Banner (STRICTLY NAME & LOCATION ONLY - NO PHONE / NO EMAIL)
  const profY = cardY + 144;
  const profH = 78;
  ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(cardX + 32, profY, cardW - 64, profH, 18, true, true);

  // Candidate Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(attempt.student_name || 'Aspirant', cardX + 54, profY + 28);

  // Candidate Location (District, State)
  const locationText = `📍 ${attempt.student_district || 'District'}, ${attempt.student_state || 'Himachal Pradesh'}`;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(locationText, cardX + 54, profY + 54);

  // Verification Shield / Score ID on Right of Profile
  const scoreCode = `ID: GUS-${(attempt.id || 'SCORE').slice(0, 6).toUpperCase()}`;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 15px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(scoreCode, cardX + cardW - 54, profY + 39);

  // 4. FOUR CORE METRIC TILES (2x2 Grid)
  const gridY = profY + profH + 24;
  const tileGap = 18;
  const tileW = (cardW - 64 - tileGap) / 2;
  const tileH = 154;

  const totalMarks = test?.total_marks ?? (attempt.total_questions ? attempt.total_questions * (test?.marks_per_question || 1) : 100);
  const timeMins = Math.floor(attempt.time_taken_seconds / 60);
  const timeSecs = attempt.time_taken_seconds % 60;
  const timeString = `${timeMins}m ${timeSecs}s`;
  const durationStr = `Duration: ${test?.duration_minutes || 60}m`;

  const tiles = [
    {
      title: 'MARKS OBTAINED',
      value: `${attempt.score}`,
      sub: `/ ${totalMarks} Marks`,
      color: '#34d399',
      border: 'rgba(52, 211, 153, 0.3)',
      bg: 'rgba(6, 78, 59, 0.25)',
      x: cardX + 32,
      y: gridY
    },
    {
      title: 'ACCURACY PERCENTAGE',
      value: `${attempt.percentage}%`,
      sub: 'Performance Score',
      color: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.3)',
      bg: 'rgba(12, 74, 110, 0.25)',
      x: cardX + 32 + tileW + tileGap,
      y: gridY
    },
    {
      title: 'REAL-TIME STATE RANK',
      value: `#${rank}`,
      sub: `Out of ${totalCandidates} Aspirants`,
      color: '#fbbf24',
      border: 'rgba(251, 191, 36, 0.35)',
      bg: 'rgba(120, 53, 15, 0.25)',
      isRank: true,
      x: cardX + 32,
      y: gridY + tileH + tileGap
    },
    {
      title: 'TIME TAKEN',
      value: timeString,
      sub: durationStr,
      color: '#f8fafc',
      border: 'rgba(148, 163, 184, 0.3)',
      bg: 'rgba(30, 41, 59, 0.35)',
      x: cardX + 32 + tileW + tileGap,
      y: gridY + tileH + tileGap
    }
  ];

  tiles.forEach((t) => {
    ctx.fillStyle = t.bg;
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    roundRect(t.x, t.y, tileW, tileH, 20, true, true);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(t.title, t.x + 24, t.y + 20);

    // Main Value
    ctx.fillStyle = t.color;
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    
    if (t.isRank) {
      // Draw trophy + rank
      ctx.fillText(`🏆 #${rank}`, t.x + 24, t.y + 76);
    } else {
      ctx.fillText(t.value, t.x + 24, t.y + 76);
    }

    // Sub-text
    ctx.fillStyle = '#64748b';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(t.sub, t.x + 24, t.y + tileH - 18);
  });

  // 5. BOTTOM PERFORMANCE BREAKDOWN PILL (Correct, Wrong, Unattempted)
  const breakY = gridY + (tileH * 2) + tileGap + 20;
  const breakH = 58;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  roundRect(cardX + 32, breakY, cardW - 64, breakH, 16, true, true);

  const colW = (cardW - 64) / 3;
  const unattempted = attempt.unattempted_answers ??
    attempt.skipped_questions ??
    (attempt.total_questions ? Math.max(0, attempt.total_questions - (attempt.attempted_questions || 0)) : 0);

  // Correct
  ctx.font = '800 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`✓  ${attempt.correct_answers} Correct`, cardX + 32 + (colW * 0.5), breakY + (breakH / 2));

  // Divider 1
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(cardX + 32 + colW, breakY + 12);
  ctx.lineTo(cardX + 32 + colW, breakY + breakH - 12);
  ctx.stroke();

  // Wrong
  ctx.fillStyle = '#f87171';
  ctx.fillText(`✕  ${attempt.wrong_answers} Wrong`, cardX + 32 + (colW * 1.5), breakY + (breakH / 2));

  // Divider 2
  ctx.beginPath();
  ctx.moveTo(cardX + 32 + (colW * 2), breakY + 12);
  ctx.lineTo(cardX + 32 + (colW * 2), breakY + breakH - 12);
  ctx.stroke();

  // Unattempted
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`?  ${unattempted} Skipped`, cardX + 32 + (colW * 2.5), breakY + (breakH / 2));

  // 6. FOOTER BRANDING & CALL-TO-ACTION (Bottom Bar)
  const footerY = height - 85;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎯 Practice Free Mock Tests & Compete on State Leaderboards!', 60, footerY);

  // Link on Right
  let cleanDomain = 'mock.gradeupstudy.com';
  try {
    const parsed = new URL(shareUrl);
    cleanDomain = parsed.hostname + (parsed.search || '');
  } catch {}

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`👉 ${cleanDomain}`, width - 60, footerY);

  // Return Canvas as Blob, DataURL, and File
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob from canvas'));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const safeName = (attempt.student_name || 'Scorecard').replace(/[^a-zA-Z0-9_-]/g, '_');
      const file = new File([blob], `GradeupStudy_Scorecard_${safeName}.png`, { type: 'image/png' });
      resolve({ blob, dataUrl, file });
    }, 'image/png', 0.95);
  });
}
