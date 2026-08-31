import React, { useState } from 'react';
import { Scale, X, Check, Clock } from 'lucide-react';

interface WeeklyWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight?: number;
  currentUnit?: 'kg' | 'lbs';
  onSaveWeight: (weight: number, unit: 'kg' | 'lbs') => Promise<void>;
  onDismiss: () => void;
}

export const WeeklyWeightModal: React.FC<WeeklyWeightModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  currentUnit = 'kg',
  onSaveWeight,
  onDismiss,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [weightValue, setWeightValue] = useState(currentWeight ? String(currentWeight) : '');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(currentUnit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseFloat(weightValue.trim());
    if (isNaN(num) || num <= 0 || num > 500) {
      setError('Please enter a valid weight number.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveWeight(num, unit);
      onClose();
    } catch (err) {
      setError('Failed to record weight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLater = () => {
    onDismiss();
    onClose();
  };

  return (
    <div
      id="weekly-weight-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleLater();
      }}
    >
      <div
        id="weekly-weight-card"
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 sm:p-6 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Weekly check-in
              </h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                Voluntary routine check-in
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLater}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isUpdating ? (
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-5">
              Would you like to update your weight for this week?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                id="weight-checkin-later-btn"
                onClick={handleLater}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                id="weight-checkin-update-btn"
                onClick={() => setIsUpdating(true)}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Update
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="weight-checkin-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Enter Current Weight
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="weight-checkin-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="500"
                  autoFocus
                  required
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="e.g. 70.5"
                  className="flex-1 px-3.5 py-2 text-xs font-mono border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
                <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setUnit('kg')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      unit === 'kg'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('lbs')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
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
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleLater}
                className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={isSaving || !weightValue.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
              >
                {isSaving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Weight</span>
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
