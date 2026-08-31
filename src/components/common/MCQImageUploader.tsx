import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Eye,
  RefreshCw,
  Clipboard,
  Check
} from 'lucide-react';
import { dataService } from '../../services/dataService';

interface MCQImageUploaderProps {
  label?: string;
  sublabel?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  placeholder?: string;
  compact?: boolean;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const MCQImageUploader: React.FC<MCQImageUploaderProps> = ({
  label,
  sublabel,
  value,
  onChange,
  placeholder = 'Upload image, paste from clipboard or enter image URL',
  compact = false,
  onToast
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcessFile = async (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      onToast?.('error', 'Please upload a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    try {
      setIsUploading(true);
      const res = await dataService.uploadQuestionImage(file);
      if (res.success && res.url) {
        onChange(res.url);
        onToast?.('success', 'Image attached successfully!');
      } else {
        throw new Error('Could not upload image');
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      onToast?.('error', err?.message || 'Failed to process image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // reset file input
    if (e.target) e.target.value = '';
  };

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        onToast?.('info', 'Press Ctrl+V (or Cmd+V) to paste an image directly.');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await handleProcessFile(blob);
          return;
        }
      }
      onToast?.('info', 'No image found in clipboard. Copy an image/screenshot and try again.');
    } catch (err) {
      onToast?.('info', 'Clipboard access not allowed. You can press Ctrl+V while focused or choose a file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        {label && (
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span>{label}</span>
            {sublabel && <span className="text-[10px] text-slate-400 font-normal">{sublabel}</span>}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {value ? (
            <div className="flex items-center gap-2 p-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="relative group cursor-pointer"
                title="Click to zoom image"
              >
                <img
                  src={value}
                  alt="Option visual"
                  className="w-9 h-9 object-contain bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              <span className="text-[10px] text-blue-800 dark:text-blue-200 font-semibold truncate max-w-[110px]">
                Image attached
              </span>

              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Upload option diagram / image"
              >
                {isUploading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-slate-500" />
                )}
                <span>+ Image</span>
              </button>

              <button
                type="button"
                onClick={handlePasteClipboard}
                className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTempUrl('');
                  setIsUrlModalOpen(true);
                }}
                className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Add Image via URL link"
              >
                <LinkIcon className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* URL MODAL */}
        {isUrlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">Enter Image Web Link</h4>
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://example.com/figure.png"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempUrl.trim()) {
                      onChange(tempUrl.trim());
                      setIsUrlModalOpen(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Attach URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE ZOOM LIGHTBOX */}
        {isPreviewOpen && value && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={value}
                alt="Enlarged option visual"
                className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
          {sublabel && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {sublabel}
            </span>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="relative group cursor-pointer"
              title="Click to enlarge image"
            >
              <img
                src={value}
                alt="Question Diagram"
                className="w-16 h-16 object-contain bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </button>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Image Attached</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {value.startsWith('data:') ? 'Local compressed image file' : value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Zoom
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-2.5 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-4 transition-all text-center ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-400'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Uploading...' : 'Upload Image / Diagram'}</span>
            </button>

            <button
              type="button"
              onClick={handlePasteClipboard}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              title="Paste screenshot from clipboard (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste Clipboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTempUrl('');
                setIsUrlModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Web Link</span>
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Drag & drop reasoning figures, mirror images, math diagrams, or charts here
          </p>
        </div>
      )}

      {/* URL MODAL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">Enter Image Web Link</h4>
            <input
              type="url"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="https://example.com/diagram.png"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempUrl.trim()) {
                    onChange(tempUrl.trim());
                    setIsUrlModalOpen(false);
                  }
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Attach URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM LIGHTBOX */}
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-2xl">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={value}
              alt="Enlarged Diagram"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
