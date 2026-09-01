import React, { useState, useEffect } from 'react';
import { FileText, Check, Trash2, X } from 'lucide-react';
import { formatHeaderDate } from '../lib/dateUtils';

interface DailyNoteProps {
  selectedDate: string;
  isToday: boolean;
  note?: string;
  onSaveNote: (targetDate: string, noteText: string) => Promise<void>;
  onClearNote: (targetDate: string) => Promise<void>;
  isSaving?: boolean;
}

const MAX_CHAR_LIMIT = 500;

export const DailyNote: React.FC<DailyNoteProps> = ({
  selectedDate,
  isToday,
  note = '',
  onSaveNote,
  onClearNote,
  isSaving = false,
}) => {
  const [draftText, setDraftText] = useState(note);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Sync draft when selected date or saved note changes
  useEffect(() => {
    setDraftText(note || '');
    setIsConfirmingClear(false);
    setSaveSuccess(false);
  }, [selectedDate, note]);

  const hasChanges = draftText.trim() !== (note || '').trim();
  const hasExistingNote = !!(note && note.trim().length > 0);
  const charCount = draftText.length;

  const handleSave = async () => {
    if (!hasChanges && !draftText.trim()) return;
    setIsSavingLocal(true);
    setSaveSuccess(false);
    try {
      await onSaveNote(selectedDate, draftText.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving daily note:', err);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleConfirmClear = async () => {
    setIsSavingLocal(true);
    try {
      await onClearNote(selectedDate);
      setDraftText('');
      setIsConfirmingClear(false);
      setSaveSuccess(false);
    } catch (err) {
      console.error('Error clearing daily note:', err);
    } finally {
      setIsSavingLocal(false);
    }
  };

  return (
    <section
      id="daily-note-section"
      className="glass-card rounded-xl p-3.5 sm:p-4 space-y-2.5 transition-all duration-200"
      aria-labelledby="daily-note-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <h3 id="daily-note-heading" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Daily Note
          </h3>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
            {isToday ? '• Today' : `• ${formatHeaderDate(selectedDate)}`}
          </span>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
          <span className={charCount > MAX_CHAR_LIMIT - 30 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
            {charCount}
          </span>
          /{MAX_CHAR_LIMIT}
        </div>
      </div>

      {/* Textarea */}
      <div>
        <label htmlFor="daily-note-textarea" className="sr-only">
          Daily Note for {selectedDate}
        </label>
        <textarea
          id="daily-note-textarea"
          value={draftText}
          onChange={(e) => {
            setDraftText(e.target.value.slice(0, MAX_CHAR_LIMIT));
            setIsConfirmingClear(false);
            setSaveSuccess(false);
          }}
          placeholder="How was your day? Write a brief note about your thoughts, achievements, or routine..."
          rows={3}
          maxLength={MAX_CHAR_LIMIT}
          className="w-full p-3 text-xs text-zinc-800 dark:text-zinc-200 glass-input rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 resize-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed font-sans"
        />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-0.5">
        {/* Left: Clear or Confirmation or Status Feedback */}
        <div className="flex items-center gap-2 min-h-6">
          {isConfirmingClear ? (
            <div className="flex items-center gap-2 text-xs bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-lg text-red-700 dark:text-red-300 backdrop-blur-xs">
              <span>Clear note?</span>
              <button
                id="confirm-clear-note-btn"
                type="button"
                onClick={handleConfirmClear}
                disabled={isSavingLocal}
                className="font-semibold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 underline cursor-pointer disabled:opacity-50"
              >
                Yes
              </button>
              <button
                id="cancel-clear-note-btn"
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : hasExistingNote || draftText.length > 0 ? (
            <button
              id="clear-daily-note-btn"
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              disabled={isSavingLocal || isSaving}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear note</span>
            </button>
          ) : null}

          {saveSuccess && !isConfirmingClear && (
            <span
              id="daily-note-saved-badge"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-xs"
            >
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>

        {/* Right: Save Button */}
        <button
          id="save-daily-note-btn"
          type="button"
          onClick={handleSave}
          disabled={isSavingLocal || isSaving || (!hasChanges && !saveSuccess)}
          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-sm"
        >
          {isSavingLocal || isSaving ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Note</span>
          )}
        </button>
      </div>
    </section>
  );
};
