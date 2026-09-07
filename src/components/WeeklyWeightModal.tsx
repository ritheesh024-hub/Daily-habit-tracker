import React, { useState, useEffect, useRef } from 'react';
import { Scale, X, Check } from 'lucide-react';

export interface WeeklyWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight?: number;
  currentUnit?: 'kg' | 'lbs';
  onSaveWeight?: (weight: number, unit: 'kg' | 'lbs') => Promise<void>;
  onSave?: (weight: number, unit: 'kg' | 'lbs') => Promise<void>;
  onDismiss?: () => void;
}

export const WeeklyWeightModal: React.FC<WeeklyWeightModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  currentUnit = 'kg',
  onSaveWeight,
  onSave,
  onDismiss,
}) => {
  const [stage, setStage] = useState<'prompt' | 'form'>('prompt');
  const [weightValue, setWeightValue] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or current weight/unit changes
  useEffect(() => {
    if (isOpen) {
      setStage('prompt');
      setWeightValue(
        currentWeight !== undefined && currentWeight !== null && currentWeight > 0
          ? String(currentWeight)
          : ''
      );
      setUnit(currentUnit || 'kg');
      setIsSaving(false);
      setError(null);
    }
  }, [isOpen, currentWeight, currentUnit]);

  // Lock background body scroll and listen for Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        if (stage === 'form') {
          handleCancel();
        } else {
          handleLater();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, stage]);

  if (!isOpen) return null;

  const handleOpenForm = () => {
    setError(null);
    setStage('form');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleLater = () => {
    if (isSaving) return;
    setError(null);
    setStage('prompt');
    if (onDismiss) {
      onDismiss();
    }
    onClose();
  };

  const handleCancel = () => {
    if (isSaving) return;
    setError(null);
    setStage('prompt');
    if (onDismiss) {
      onDismiss();
    }
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setError(null);
    const cleanStr = weightValue.trim();
    if (!cleanStr) {
      setError('Please enter your new weight.');
      inputRef.current?.focus();
      return;
    }

    const num = parseFloat(cleanStr);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive weight.');
      inputRef.current?.focus();
      return;
    }
    if (num > 500) {
      setError('Please enter a realistic weight value (up to 500).');
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const saveHandler = onSaveWeight || onSave;
      if (!saveHandler) {
        throw new Error('Save handler is not configured.');
      }
      await saveHandler(num, unit);
      // On success, reset stage and close modal
      setStage('prompt');
      onClose();
    } catch (err: any) {
      console.error('Failed to save weekly weight:', err);
      setError(
        err?.message && !err.message.includes('object')
          ? err.message
          : 'Unable to save your weight. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="weekly-weight-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-weight-title"
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          if (stage === 'form') {
            handleCancel();
          } else {
            handleLater();
          }
        }
      }}
    >
      <div
        id="weekly-weight-card"
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto glass-modal rounded-2xl shadow-2xl p-5 sm:p-6 transition-all border border-zinc-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/40 dark:border-white/10 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-2xs shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="weekly-weight-title"
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                {stage === 'prompt' ? 'Weekly check-in' : 'Update your weight'}
              </h3>
              {stage === 'prompt' ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  Voluntary routine check-in
                </p>
              ) : currentWeight !== undefined && currentWeight !== null && currentWeight > 0 ? (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                  Current weight: <span className="font-mono">{currentWeight} {currentUnit || 'kg'}</span>
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  Voluntary routine check-in
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            id="weekly-weight-close-btn"
            disabled={isSaving}
            onClick={stage === 'prompt' ? handleLater : handleCancel}
            aria-label={stage === 'prompt' ? 'Dismiss check-in' : 'Cancel weight update'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stage 1: Weekly Check-in Prompt */}
        {stage === 'prompt' && (
          <div id="weekly-weight-prompt-view" className="space-y-5">
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Would you like to update your weight for this week?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="weight-checkin-later-btn"
                onClick={handleLater}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                id="weight-checkin-update-btn"
                onClick={handleOpenForm}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                Update
              </button>
            </div>
          </div>
        )}

        {/* Stage 2: Weight Update Form */}
        {stage === 'form' && (
          <form id="weekly-weight-update-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label
                htmlFor="weight-checkin-input"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5"
              >
                New weight
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="weight-checkin-input"
                  ref={inputRef}
                  type="number"
                  step="0.1"
                  min="1"
                  max="500"
                  required
                  disabled={isSaving}
                  value={weightValue}
                  onChange={(e) => {
                    setWeightValue(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={unit === 'kg' ? 'e.g. 70.5' : 'e.g. 155.0'}
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-zinc-300/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
                />
                <div className="flex rounded-xl border border-zinc-300/60 dark:border-white/10 overflow-hidden bg-zinc-100/80 dark:bg-zinc-800/80 p-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setUnit('kg')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 ${
                      unit === 'kg'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setUnit('lbs')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 ${
                      unit === 'lbs'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    lbs
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div
                id="weight-checkin-error"
                role="alert"
                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 font-medium"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="weight-checkin-cancel-btn"
                disabled={isSaving}
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="weight-checkin-save-btn"
                disabled={isSaving || !weightValue.trim()}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
