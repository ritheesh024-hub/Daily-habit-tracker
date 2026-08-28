import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Edit2,
  Check,
  Trash2,
  AlertCircle,
  Clock,
  RotateCcw,
  Plus,
  Utensils,
  ChevronRight,
  Info,
  Calendar,
} from 'lucide-react';
import { FoodItem, FoodNutritionTotal, FoodScanResult, FoodLog, UserProfile } from '../types';
import {
  compressAndPrepareImage,
  scanFoodWithAI,
  saveFoodLog,
  deleteFoodLog,
  PreparedImageResult,
} from '../lib/foodService';
import { formatHeaderDate, getTodayDateString } from '../lib/dateUtils';

interface ScanFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  selectedDate: string;
  foodLogs: FoodLog[];
  onFoodLogSaved?: (newLog: FoodLog) => void;
  onFoodLogDeleted?: (id: string) => void;
}

type ModalViewMode = 'scan' | 'history';

export const ScanFoodModal: React.FC<ScanFoodModalProps> = ({
  isOpen,
  onClose,
  user,
  selectedDate,
  foodLogs,
  onFoodLogSaved,
  onFoodLogDeleted,
}) => {
  const [viewMode, setViewMode] = useState<ModalViewMode>('scan');

  // Image selection & preparation state
  const [preparedImage, setPreparedImage] = useState<PreparedImageResult | null>(null);
  const [userPromptNotes, setUserPromptNotes] = useState<string>('');
  const [isPreparingImage, setIsPreparingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FoodScanResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Meal type selector
  const [selectedMealType, setSelectedMealType] = useState<string>('Lunch');

  // Editable fields state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableFoods, setEditableFoods] = useState<FoodItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      // Determine default meal type based on current hour
      const hour = new Date().getHours();
      if (hour < 11) setSelectedMealType('Breakfast');
      else if (hour < 16) setSelectedMealType('Lunch');
      else if (hour < 21) setSelectedMealType('Dinner');
      else setSelectedMealType('Snack');
      setSaveSuccessMessage(null);
    } else {
      // Reset transient state
      setPreparedImage(null);
      setUserPromptNotes('');
      setAnalysisResult(null);
      setAnalysisError(null);
      setImageError(null);
      setIsEditing(false);
      setEditableFoods([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle File selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setAnalysisError(null);
    setAnalysisResult(null);
    setIsPreparingImage(true);

    try {
      const prepared = await compressAndPrepareImage(file);
      setPreparedImage(prepared);
    } catch (err: any) {
      setImageError(err?.message || 'Could not process image.');
      setPreparedImage(null);
    } finally {
      setIsPreparingImage(false);
      // Reset input value so same file can be selected again
      if (e.target) e.target.value = '';
    }
  };

  // Trigger Analysis
  const handleStartAnalysis = async () => {
    if (!preparedImage) {
      setImageError('Please select or take a photo first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await scanFoodWithAI(
        preparedImage.base64,
        preparedImage.mimeType,
        userPromptNotes
      );
      setAnalysisResult(result);
      setEditableFoods(result.foods);
      setIsEditing(false);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Manual meal entry without AI
  const handleStartManualEntry = () => {
    setAnalysisError(null);
    setImageError(null);
    setAnalysisResult({
      isFood: true,
      confidence: 'high',
      foods: [
        {
          name: 'Meal Item',
          estimatedPortion: '1 serving',
          calories: 250,
          proteinGrams: 10,
          carbsGrams: 30,
          fatGrams: 8,
          fiberGrams: 3,
        },
      ],
      total: {
        calories: 250,
        proteinGrams: 10,
        carbsGrams: 30,
        fatGrams: 8,
        fiberGrams: 3,
        sugarGrams: 0,
      },
      suggestions: ['Manual entry logged.'],
    });
    setEditableFoods([
      {
        name: 'Meal Item',
        estimatedPortion: '1 serving',
        calories: 250,
        proteinGrams: 10,
        carbsGrams: 30,
        fatGrams: 8,
        fiberGrams: 3,
      },
    ]);
    setIsEditing(true);
  };

  // Recompute total nutrition when edited foods change
  const computeEditableTotal = (): FoodNutritionTotal => {
    let calories = 0;
    let proteinGrams = 0;
    let carbsGrams = 0;
    let fatGrams = 0;
    let fiberGrams = 0;
    let sugarGrams = 0;

    for (const food of editableFoods) {
      calories += Number(food.calories) || 0;
      proteinGrams += Number(food.proteinGrams) || 0;
      carbsGrams += Number(food.carbsGrams) || 0;
      fatGrams += Number(food.fatGrams) || 0;
      fiberGrams += Number(food.fiberGrams) || 0;
      sugarGrams += Number(food.sugarGrams) || 0;
    }

    return {
      calories: Math.round(calories),
      proteinGrams: Math.round(proteinGrams * 10) / 10,
      carbsGrams: Math.round(carbsGrams * 10) / 10,
      fatGrams: Math.round(fatGrams * 10) / 10,
      fiberGrams: Math.round(fiberGrams * 10) / 10,
      sugarGrams: Math.round(sugarGrams * 10) / 10,
    };
  };

  // Handle food item attribute update during editing
  const handleUpdateFoodItem = (index: number, field: keyof FoodItem, value: any) => {
    const updated = [...editableFoods];
    updated[index] = {
      ...updated[index],
      [field]: field === 'name' || field === 'estimatedPortion' ? value : Number(value) || 0,
    };
    setEditableFoods(updated);
  };

  // Add custom food item during edit
  const handleAddFoodItem = () => {
    setEditableFoods([
      ...editableFoods,
      {
        name: 'New Food Item',
        estimatedPortion: '1 serving',
        calories: 100,
        proteinGrams: 5,
        carbsGrams: 15,
        fatGrams: 2,
        fiberGrams: 1,
      },
    ]);
  };

  // Remove food item during edit
  const handleRemoveFoodItem = (index: number) => {
    setEditableFoods(editableFoods.filter((_, i) => i !== index));
  };

  // Save Food Log to Firestore
  const handleSaveFoodLog = async () => {
    if (!user?.uid) {
      setAnalysisError('Please sign in to save food logs.');
      return;
    }

    if (editableFoods.length === 0) {
      setAnalysisError('No food items to save. Please add at least one item.');
      return;
    }

    setIsSaving(true);
    setAnalysisError(null);

    const total = computeEditableTotal();

    try {
      const saved = await saveFoodLog(user.uid, {
        date: selectedDate,
        mealType: selectedMealType,
        foods: editableFoods,
        total,
        source: 'ai',
        confidence: analysisResult?.confidence || 'medium',
        suggestions: analysisResult?.suggestions || [],
      });

      if (onFoodLogSaved) {
        onFoodLogSaved(saved);
      }

      setSaveSuccessMessage('Food meal saved to your daily log!');
      setTimeout(() => {
        setSaveSuccessMessage(null);
        // Switch to history view so user can see their logged meal
        setViewMode('history');
        // Reset scan form
        setPreparedImage(null);
        setAnalysisResult(null);
      }, 1200);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to save food log.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter logs for the currently selected date & all logs
  const logsForSelectedDate = foodLogs.filter((log) => log.date === selectedDate);
  const totalCaloriesForDate = logsForSelectedDate.reduce((sum, log) => sum + (log.total?.calories || 0), 0);
  const totalProteinForDate = logsForSelectedDate.reduce((sum, log) => sum + (log.total?.proteinGrams || 0), 0);
  const totalCarbsForDate = logsForSelectedDate.reduce((sum, log) => sum + (log.total?.carbsGrams || 0), 0);
  const totalFatForDate = logsForSelectedDate.reduce((sum, log) => sum + (log.total?.fatGrams || 0), 0);

  return (
    <div
      id="scan-food-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-food-title"
    >
      <div
        id="scan-food-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-medium">
              🍽️
            </div>
            <div>
              <h2 id="scan-food-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Scan Food with AI
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Log for {formatHeaderDate(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* View switcher tabs */}
            <div className="bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg flex text-xs font-medium mr-2">
              <button
                type="button"
                onClick={() => setViewMode('scan')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'scan'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Scan Photo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('history')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  viewMode === 'history'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <span>History</span>
                {logsForSelectedDate.length > 0 && (
                  <span className="w-4 h-4 text-[10px] rounded-full bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 inline-flex items-center justify-center font-bold">
                    {logsForSelectedDate.length}
                  </span>
                )}
              </button>
            </div>

            <button
              id="close-scan-food-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {viewMode === 'scan' ? (
            <>
              {/* Success Notification Banner */}
              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{saveSuccessMessage}</span>
                </div>
              )}

              {/* Step 1: Image Selection or Preview */}
              {!analysisResult && !isAnalyzing && (
                <div className="space-y-4">
                  {/* Photo Preview or Drop Area */}
                  {preparedImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center">
                      <img
                        src={preparedImage.previewUrl}
                        alt="Food to analyze"
                        className="w-full max-h-64 object-contain"
                      />
                      <div className="w-full p-2.5 bg-zinc-900/80 backdrop-blur-xs text-white text-xs flex items-center justify-between">
                        <span className="truncate max-w-[200px]">{preparedImage.fileName} ({preparedImage.fileSizeFormatted})</span>
                        <button
                          type="button"
                          onClick={() => setPreparedImage(null)}
                          className="text-zinc-300 hover:text-white underline cursor-pointer text-xs flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 sm:p-8 text-center bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col items-center justify-center space-y-3 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shadow-2xs">
                        <Camera className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Upload or Take a Food Photo
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                          Supported formats: JPG, PNG, WEBP (under 12MB). Photo is processed securely for nutritional estimates.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {/* Device Camera Capture */}
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
                          <Camera className="w-4 h-4" />
                          <span>Take Photo</span>
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>

                        {/* File Upload Picker */}
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Choose File</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>

                        {/* Manual Entry Button */}
                        <button
                          type="button"
                          onClick={handleStartManualEntry}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Manual Entry</span>
                        </button>
                      </div>

                      {isPreparingImage && (
                        <p className="text-xs text-zinc-500 animate-pulse">Preparing photo...</p>
                      )}
                    </div>
                  )}

                  {/* Meal Type selection & Optional Notes */}
                  {preparedImage && (
                    <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Meal Type:
                        </label>
                        <div className="flex gap-1">
                          {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedMealType(type)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                                selectedMealType === type
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                          Optional description / notes:
                        </label>
                        <input
                          type="text"
                          value={userPromptNotes}
                          onChange={(e) => setUserPromptNotes(e.target.value)}
                          placeholder="e.g. Grilled salmon salad with olive oil dressing..."
                          maxLength={150}
                          className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          id="analyze-food-btn"
                          type="button"
                          onClick={handleStartAnalysis}
                          disabled={isAnalyzing}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Food with AI</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleStartManualEntry}
                          className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                          title="Enter details manually"
                        >
                          Manual
                        </button>
                      </div>
                    </div>
                  )}

                  {imageError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{imageError}</span>
                    </div>
                  )}

                  {analysisError && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">{analysisError}</p>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                            You can edit and log this meal manually without waiting.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartManualEntry}
                        className="self-start px-3 py-1.5 bg-amber-200/60 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      >
                        Enter meal items manually →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Analyzing State */}
              {isAnalyzing && (
                <div className="py-12 px-4 text-center space-y-4 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-3 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-sm">
                      🍽️
                    </div>
                  </div>

                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Analyzing food with AI...
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Identifying ingredients, estimating portion sizes and calculating macronutrients.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Analysis Results View */}
              {analysisResult && !isAnalyzing && (
                <div className="space-y-4">
                  {/* Estimates disclaimer mandate */}
                  <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Estimated nutrition</span>
                      <span>Values are approximate and may vary depending on ingredients, portion size and preparation.</span>
                    </div>
                  </div>

                  {/* If Food was not identified confidently */}
                  {(!analysisResult.isFood || editableFoods.length === 0) ? (
                    <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 mx-auto flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Food could not be identified confidently.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                          {analysisResult.unidentifiedReason || 'Please provide a clearer, closer photo or manually enter food items.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisResult(null);
                            setPreparedImage(null);
                          }}
                          className="px-3.5 py-2 text-xs rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                        >
                          Try Another Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddFoodItem();
                            setIsEditing(true);
                          }}
                          className="px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-50 cursor-pointer"
                        >
                          Add Food Manually
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Detected Foods Card */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                              Food detected ({selectedMealType})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono capitalize">
                              {analysisResult.confidence} confidence
                            </span>
                          </div>

                          <button
                            id="edit-estimate-btn"
                            type="button"
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Done Editing' : 'Edit estimate'}</span>
                          </button>
                        </div>

                        {/* List of Detected / Editable Foods */}
                        <div className="p-3.5 space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                          {editableFoods.map((food, idx) => (
                            <div key={idx} className={`${idx > 0 ? 'pt-3' : ''} space-y-2`}>
                              {isEditing ? (
                                <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                  <div className="flex items-center justify-between gap-2">
                                    <input
                                      type="text"
                                      value={food.name}
                                      onChange={(e) => handleUpdateFoodItem(idx, 'name', e.target.value)}
                                      placeholder="Food name"
                                      className="flex-1 text-xs font-semibold px-2 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFoodItem(idx)}
                                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Portion:</label>
                                      <input
                                        type="text"
                                        value={food.estimatedPortion}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'estimatedPortion', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Calories (kcal):</label>
                                      <input
                                        type="number"
                                        value={food.calories}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'calories', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Protein (g):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={food.proteinGrams}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'proteinGrams', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Carbs (g):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={food.carbsGrams}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'carbsGrams', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Fat (g):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={food.fatGrams}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'fatGrams', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-zinc-500 block">Fiber (g):</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={food.fiberGrams}
                                        onChange={(e) => handleUpdateFoodItem(idx, 'fiberGrams', e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                        {food.name}
                                      </span>
                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Estimated portion: {food.estimatedPortion}
                                      </p>
                                    </div>
                                    <div className="text-right font-mono">
                                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        ~{food.calories} kcal
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-1.5 mt-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-800/40 px-2 py-1 rounded">
                                    <span>P: <strong className="text-zinc-900 dark:text-zinc-200">~{food.proteinGrams}g</strong></span>
                                    <span>C: <strong className="text-zinc-900 dark:text-zinc-200">~{food.carbsGrams}g</strong></span>
                                    <span>F: <strong className="text-zinc-900 dark:text-zinc-200">~{food.fatGrams}g</strong></span>
                                    <span>Fib: <strong className="text-zinc-900 dark:text-zinc-200">~{food.fiberGrams}g</strong></span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {isEditing && (
                            <button
                              type="button"
                              onClick={handleAddFoodItem}
                              className="w-full py-1.5 text-xs text-zinc-700 dark:text-zinc-300 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Item
                            </button>
                          )}
                        </div>

                        {/* Total Estimated Nutrition Summary */}
                        {(() => {
                          const total = computeEditableTotal();
                          return (
                            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">
                                Total estimated nutrition
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                  <span className="text-[10px] text-zinc-500 block uppercase">Calories</span>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    ~{total.calories} kcal
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                  <span className="text-[10px] text-zinc-500 block uppercase">Protein</span>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    ~{total.proteinGrams} g
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                  <span className="text-[10px] text-zinc-500 block uppercase">Carbs</span>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    ~{total.carbsGrams} g
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                  <span className="text-[10px] text-zinc-500 block uppercase">Fat</span>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    ~{total.fatGrams} g
                                  </span>
                                </div>
                                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-zinc-500 block uppercase">Fiber</span>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                    ~{total.fiberGrams} g
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* AI Suggestions Section */}
                      {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            💡 Suggestions
                          </span>
                          <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                            {analysisResult.suggestions.map((suggestion, sIdx) => (
                              <li key={sIdx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons: Save Food / Scan Another */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          id="save-food-btn"
                          type="button"
                          onClick={handleSaveFoodLog}
                          disabled={isSaving}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSaving ? 'Saving to Log...' : 'Save Food'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisResult(null);
                            setPreparedImage(null);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                        >
                          Scan Another
                        </button>
                      </div>
                    </>
                  )}

                  {analysisError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* View Mode: Food History */
            <div className="space-y-4">
              {/* Daily total summary header */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {formatHeaderDate(selectedDate)} Meals
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {logsForSelectedDate.length} logged meal{logsForSelectedDate.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ~{totalCaloriesForDate} kcal
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    P: {totalProteinForDate}g • C: {totalCarbsForDate}g • F: {totalFatForDate}g
                  </p>
                </div>
              </div>

              {/* List of food logs for selected date */}
              {logsForSelectedDate.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    No food logged for {formatHeaderDate(selectedDate)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('scan')}
                    className="inline-flex items-center gap-1 text-xs text-zinc-900 dark:text-zinc-100 underline font-medium cursor-pointer"
                  >
                    Scan your first meal today
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {logsForSelectedDate.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {log.mealType || 'Meal'}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                            ~{log.total?.calories || 0} kcal
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!user?.uid) return;
                              if (confirm('Delete this food log?')) {
                                await deleteFoodLog(user.uid, log.id);
                                if (onFoodLogDeleted) onFoodLogDeleted(log.id);
                              }
                            }}
                            className="text-zinc-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Food items summary */}
                      <div className="space-y-1">
                        {log.foods.map((food, fIdx) => (
                          <div key={fIdx} className="text-xs flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                            <span>• {food.name} <span className="text-zinc-400 text-[11px]">({food.estimatedPortion})</span></span>
                            <span className="font-mono text-zinc-500 text-[11px]">~{food.calories} kcal</span>
                          </div>
                        ))}
                      </div>

                      {/* Macronutrients */}
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-500 font-mono border-t border-zinc-100 dark:border-zinc-800">
                        <span>P: {log.total?.proteinGrams || 0}g</span>
                        <span>C: {log.total?.carbsGrams || 0}g</span>
                        <span>F: {log.total?.fatGrams || 0}g</span>
                        <span>Fiber: {log.total?.fiberGrams || 0}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick action to scan another */}
              <button
                type="button"
                onClick={() => setViewMode('scan')}
                className="w-full py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Scan Another Meal</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          <span>Daily Habits Nutrition Estimator</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
