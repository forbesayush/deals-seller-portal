import React from 'react';
import { Loader2, CheckCircle2, XCircle, FileSpreadsheet, X, Download } from 'lucide-react';

export type ExportStage = 'idle' | 'fetching' | 'processing' | 'generating' | 'downloading' | 'complete' | 'cancelled' | 'error';

interface ExportProgressModalProps {
  isOpen: boolean;
  stage: ExportStage;
  progress: number; // 0 to 100
  title?: string;
  errorMsg?: string | null;
  onCancel: () => void;
  onClose: () => void;
}

export function ExportProgressModal({
  isOpen,
  stage,
  progress,
  title = 'Exporting MIS Report',
  errorMsg,
  onCancel,
  onClose,
}: ExportProgressModalProps) {
  if (!isOpen) return null;

  const stagesList = [
    { key: 'fetching', label: '1. Fetching records from database...' },
    { key: 'processing', label: '2. Sanitizing & aggregating dataset...' },
    { key: 'generating', label: '3. Compiling UTF-8 CSV / Excel file...' },
    { key: 'downloading', label: '4. Finalizing file download...' },
  ];

  const getStageIndex = (s: ExportStage) => {
    switch (s) {
      case 'fetching': return 0;
      case 'processing': return 1;
      case 'generating': return 2;
      case 'downloading':
      case 'complete': return 3;
      default: return 0;
    }
  };

  const currentIdx = getStageIndex(stage);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="premium-card max-w-md w-full p-6 animate-scale-up border border-brand-500/40 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Netflix-Style Pipeline</p>
              <h3 className="font-extrabold text-base">{title}</h3>
            </div>
          </div>
          {(stage === 'complete' || stage === 'error' || stage === 'cancelled') && (
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300 capitalize">
              {stage === 'complete' ? 'Export Ready!' : stage === 'cancelled' ? 'Export Cancelled' : stage === 'error' ? 'Export Failed' : `Status: ${stage}...`}
            </span>
            <span className="font-mono text-brand-600 dark:text-violet-400">{Math.min(100, Math.max(0, progress))}%</span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                stage === 'complete' ? 'bg-emerald-500' : stage === 'error' ? 'bg-rose-500' : 'bg-gradient-to-r from-brand-600 to-indigo-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Multi-Stage List */}
        <div className="space-y-2.5 text-xs border-t border-b py-3" style={{ borderColor: 'var(--color-border)' }}>
          {stagesList.map((st, idx) => {
            const isFinished = currentIdx > idx || stage === 'complete';
            const isCurrent = currentIdx === idx && stage !== 'complete' && stage !== 'error' && stage !== 'cancelled';
            return (
              <div key={st.key} className="flex items-center gap-2.5">
                {isFinished ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-brand-600 dark:text-violet-400 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex-shrink-0" />
                )}
                <span className={`font-semibold ${isFinished ? 'text-slate-400 line-through' : isCurrent ? 'text-slate-800 dark:text-white font-extrabold' : 'text-slate-400'}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error / Completion Banner */}
        {stage === 'complete' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> Download started! File saved to your downloads folder.
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 font-semibold flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {stage !== 'complete' && stage !== 'error' && stage !== 'cancelled' ? (
            <button onClick={onCancel} className="btn btn-ghost text-rose-500 w-full btn-sm font-bold">
              Cancel Export Process
            </button>
          ) : (
            <button onClick={onClose} className="btn btn-primary w-full btn-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
