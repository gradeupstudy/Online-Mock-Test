import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  MessageCircle, 
  ExternalLink,
  Smartphone,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Attempt, Test } from '../../types';
import { generateScorecardImageBlob } from '../../utils/generateScorecardImage';
import { dataService } from '../../services/dataService';

interface ShareScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: Attempt;
  test?: Test | null;
  rank: number;
  totalCandidates: number;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ShareScorecardModal: React.FC<ShareScorecardModalProps> = ({
  isOpen,
  onClose,
  attempt,
  test,
  rank,
  totalCandidates,
  onToast
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [canSystemShareFiles, setCanSystemShareFiles] = useState(false);

  const testTitle = test?.title || 'Mock Test';
  const shareUrl = dataService.getPublicShareableUrl(test?.slug || test?.test_code || attempt.test_id);

  const totalMarks = test?.total_marks ?? (attempt.total_questions ? attempt.total_questions * (test?.marks_per_question || 1) : 100);

  // Professional Formatted Share Text matching user requirement with score and link
  const shareText = `🎯 I scored ${attempt.score} marks (${attempt.percentage}%) and secured Rank #${rank} on Gradeup Study's "${testTitle}"! Try it now: ${shareUrl}`;

  useEffect(() => {
    if (isOpen) {
      generateImage();
    }
  }, [isOpen, attempt, test, rank, totalCandidates]);

  const generateImage = async () => {
    setIsGenerating(true);
    try {
      const settings = await dataService.getSettings();
      const result = await generateScorecardImageBlob({
        attempt,
        test,
        rank,
        totalCandidates,
        brandName: settings.brand_name || 'Gradeup Study',
        logoUrl: settings.logo_url,
        shareUrl
      });
      setImageBlob(result.blob);
      setImageDataUrl(result.dataUrl);
      setImageFile(result.file);

      // Check system share support for files
      if (navigator.canShare && navigator.canShare({ files: [result.file] })) {
        setCanSystemShareFiles(true);
      } else {
        setCanSystemShareFiles(false);
      }
    } catch (err) {
      console.error('Failed to generate scorecard image:', err);
      onToast?.('error', 'Could not generate scorecard image. You can still share the score text!');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async (): Promise<boolean> => {
    if (!imageBlob) return false;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': imageBlob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
        return true;
      }
    } catch (e) {
      console.warn('Direct image clipboard copy not supported:', e);
    }
    return false;
  };

  const handleDownloadImage = (silent = false) => {
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    const safeName = (attempt.student_name || 'Scorecard').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `GradeupStudy_Scorecard_${safeName}.png`;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!silent) {
      // Also copy text to clipboard for convenient pasting
      navigator.clipboard?.writeText(shareText).catch(() => {});
      onToast?.('success', 'Scorecard HD image downloaded & score link copied to clipboard!');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      onToast?.('success', 'Score text & test link copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      onToast?.('error', 'Failed to copy to clipboard.');
    }
  };

  const handleCopyImage = async () => {
    const success = await copyImageToClipboard();
    if (success) {
      onToast?.('success', 'Scorecard Image copied to clipboard! Paste (Ctrl+V) directly anywhere.');
    } else {
      handleDownloadImage();
    }
  };

  const handleWhatsAppShare = async () => {
    // 1. If mobile system share supports files, share image + score text + link directly
    if (imageFile && canSystemShareFiles && navigator.share) {
      try {
        await navigator.share({
          title: `Gradeup Study Scorecard - ${attempt.student_name}`,
          text: shareText,
          files: [imageFile]
        });
        onToast?.('success', 'Scorecard image & score shared successfully!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Fallback on Desktop Web / Non-file share:
    // Copy image to clipboard + auto-save image + copy link + open WhatsApp
    await copyImageToClipboard();
    handleDownloadImage(true);
    
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onToast?.('success', 'Scorecard Image copied to clipboard & downloaded! Paste (Ctrl+V) directly into WhatsApp chat.');
  };

  const handleTelegramShare = async () => {
    // 1. If mobile system share supports files, share image + score text + link directly
    if (imageFile && canSystemShareFiles && navigator.share) {
      try {
        await navigator.share({
          title: `Gradeup Study Scorecard - ${attempt.student_name}`,
          text: shareText,
          files: [imageFile]
        });
        onToast?.('success', 'Scorecard image & score shared successfully!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Fallback on Desktop:
    await copyImageToClipboard();
    handleDownloadImage(true);

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`🎯 I scored ${attempt.score} marks (${attempt.percentage}%) and secured Rank #${rank} on Gradeup Study's "${testTitle}"! Try it now!`)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    onToast?.('success', 'Scorecard Image copied to clipboard & downloaded! Paste (Ctrl+V) directly into Telegram chat.');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await copyImageToClipboard();
      handleDownloadImage(true);
      handleCopyText();
      return;
    }

    try {
      if (imageFile && canSystemShareFiles) {
        // Native share with attached HD scorecard image + text + link
        await navigator.share({
          title: `Gradeup Study Scorecard - ${attempt.student_name}`,
          text: shareText,
          files: [imageFile]
        });
        onToast?.('success', 'Scorecard image & score link shared successfully!');
      } else {
        // Text & URL share
        await navigator.share({
          title: `Gradeup Study Scorecard - ${attempt.student_name}`,
          text: shareText,
          url: shareUrl
        });
        onToast?.('success', 'Scorecard shared successfully!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        await copyImageToClipboard();
        handleCopyText();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="share-scorecard-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="share-scorecard-modal-container"
        className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Share Scorecard <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Share your achievement on WhatsApp, Telegram & Social Media
              </p>
            </div>
          </div>
          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-thin">
          
          {/* PRIVACY GUARANTEE BANNER */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Privacy Protected:</strong> Your mobile number & email are strictly hidden from the scorecard image & shareable link.
            </span>
          </div>

          {/* SCORECARD IMAGE PREVIEW */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Generated Scorecard Graphic (HD)
              </span>
              <button
                onClick={generateImage}
                disabled={isGenerating}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> Regenerate
              </button>
            </div>

            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center group">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-xs font-medium">Generating high-definition scorecard image...</p>
                </div>
              ) : imageDataUrl ? (
                <>
                  <img
                    src={imageDataUrl}
                    alt="Official Scorecard Preview"
                    className="w-full h-full object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <button
                      onClick={() => handleDownloadImage()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                    <button
                      onClick={handleCopyImage}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer border border-slate-600"
                    >
                      {copiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                      <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-rose-400">Failed to render preview</p>
              )}
            </div>
          </div>

          {/* FORMATTED TEXT PREVIEW & COPY BOX */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Caption & Test Link
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="copy-scorecard-img-btn"
                  onClick={handleCopyImage}
                  disabled={!imageBlob || isGenerating}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Copy Scorecard Graphic image to clipboard"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
                </button>
                <span className="text-slate-600">|</span>
                <button
                  id="copy-scorecard-text-btn"
                  onClick={handleCopyText}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy Caption'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium leading-relaxed select-all">
              <p className="whitespace-pre-wrap">{shareText}</p>
            </div>
          </div>

          {/* PRIMARY ONE-CLICK SHARING BUTTONS */}
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* WhatsApp Share */}
              <button
                id="share-whatsapp-btn"
                onClick={handleWhatsAppShare}
                disabled={isGenerating}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4 shrink-0 fill-white" />
                <span>Share on WhatsApp</span>
              </button>

              {/* Telegram Share */}
              <button
                id="share-telegram-btn"
                onClick={handleTelegramShare}
                disabled={isGenerating}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 shrink-0 fill-white" />
                <span>Share on Telegram</span>
              </button>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Download Scorecard Image */}
              <button
                id="download-scorecard-img-btn"
                onClick={() => handleDownloadImage()}
                disabled={!imageDataUrl || isGenerating}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-800/80 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Save HD Image (PNG)</span>
              </button>

              {/* System Native Share (with Image File on Mobile) */}
              <button
                id="system-share-btn"
                onClick={handleNativeShare}
                disabled={isGenerating}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4" />
                <span>{canSystemShareFiles ? 'Share Image & Link' : 'Share Scorecard'}</span>
              </button>

            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Gradeup Study Official Assessment</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
