import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, ExerciseCategory, ExerciseType, ExerciseInstruction } from '../types';
import { ExerciseCategory as Categories, ExerciseType as Types } from '../types';
import { PlusIcon, MinusIcon, MoveUpIcon, MoveDownIcon } from '../components/icons/NavigationIcons';
import { VideoUploadWidget } from './VideoUploadWidget';

interface ExerciseFormProps {
  exercise?: Partial<Exercise>;
  onSubmit: (exerciseData: Partial<Exercise>) => void;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

interface InstructionItemProps {
  instruction: ExerciseInstruction;
  index: number;
  onUpdate: (index: number, instruction: ExerciseInstruction) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const InstructionItem: React.FC<InstructionItemProps> = ({
  instruction,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const { t } = useTranslation(['common', 'exercises']);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Step {instruction.step}
        </span>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.moveUp')}
          >
            <MoveUpIcon />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.moveDown')}
          >
            <MoveDownIcon />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
            title={t('common.remove')}
          >
            <MinusIcon />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        <textarea
          value={instruction.text}
          onChange={(e) => onUpdate(index, { ...instruction, text: e.target.value })}
          placeholder={t('exercises.instructionPlaceholder', 'Describe this step...')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
        
        <div>
          <label htmlFor={`duration-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('exercises.stepDuration', 'Duration (seconds)')}
          </label>
          <input
            id={`duration-${index}`}
            type="number"
            min="0"
            value={instruction.duration_seconds || ''}
            onChange={(e) => onUpdate(index, {
              ...instruction,
              duration_seconds: e.target.value ? parseInt(e.target.value, 10) : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder={t('common.optional')}
          />
        </div>
      </div>
    </div>
  );
};

export const ExerciseForm: React.FC<ExerciseFormProps> = ({
  exercise,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
}) => {
  const { t } = useTranslation(['common', 'exercises']);

  // Form state
  const [name, setName] = useState(exercise?.name || '');
  const [description, setDescription] = useState(exercise?.description || '');
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category || Categories.CORE);
  const [exerciseType, setExerciseType] = useState<ExerciseType>(exercise?.exercise_type || Types.TIME_BASED);
  const [defaultDuration, setDefaultDuration] = useState(exercise?.default_duration?.toString() || '');
  const [defaultSets, setDefaultSets] = useState(exercise?.default_sets?.toString() || '');
  const [defaultReps, setDefaultReps] = useState(exercise?.default_reps?.toString() || '');
  const [repDurationSeconds, setRepDurationSeconds] = useState(exercise?.rep_duration_seconds?.toString() || '');
  const [difficultyLevel, setDifficultyLevel] = useState(exercise?.difficulty_level || 'beginner');
  const [equipmentNeeded, setEquipmentNeeded] = useState<string[]>(exercise?.equipment_needed || []);
  const [muscleGroups, setMuscleGroups] = useState<string[]>(exercise?.muscle_groups || []);
  const [tags, setTags] = useState<string[]>(exercise?.tags || []);
  const [instructions, setInstructions] = useState<ExerciseInstruction[]>(
    exercise?.instructions || [{ step: 1, text: '' }]
  );
  const [isPublic, setIsPublic] = useState(exercise?.is_public || false);
  const [customVideoUrl, setCustomVideoUrl] = useState(exercise?.custom_video_url || '');

  const [newEquipment, setNewEquipment] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newTag, setNewTag] = useState('');

  // Form persistence key - use 'create' or exercise ID for editing
  const persistenceKey = `exercise-form-${isEditing && exercise?.id ? exercise.id : 'create'}`;

  // Save form state to localStorage whenever it changes
  useEffect(() => {
    const formState = {
      name,
      description,
      category,
      exerciseType,
      defaultDuration,
      defaultSets,
      defaultReps,
      repDurationSeconds,
      difficultyLevel,
      equipmentNeeded,
      muscleGroups,
      tags,
      instructions,
      isPublic,
      customVideoUrl,
      newEquipment,
      newMuscleGroup,
      newTag,
    };

    // Only save if form has content (avoid saving empty states)
    if (name.trim() || description.trim() || instructions.some(i => i.text.trim())) {
      localStorage.setItem(persistenceKey, JSON.stringify(formState));
    }
  }, [
    name, description, category, exerciseType, defaultDuration, defaultSets, 
    defaultReps, repDurationSeconds, difficultyLevel, equipmentNeeded, 
    muscleGroups, tags, instructions, isPublic, customVideoUrl,
    newEquipment, newMuscleGroup, newTag, persistenceKey
  ]);

  // Restore form state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem(persistenceKey);
    if (savedState && !isEditing) { // Only restore for new exercises, not when editing existing ones
      try {
        const parsedState = JSON.parse(savedState);
        setName(parsedState.name || '');
        setDescription(parsedState.description || '');
        setCategory(parsedState.category || Categories.CORE);
        setExerciseType(parsedState.exerciseType || Types.TIME_BASED);
        setDefaultDuration(parsedState.defaultDuration || '');
        setDefaultSets(parsedState.defaultSets || '');
        setDefaultReps(parsedState.defaultReps || '');
        setRepDurationSeconds(parsedState.repDurationSeconds || '');
        setDifficultyLevel(parsedState.difficultyLevel || 'beginner');
        setEquipmentNeeded(parsedState.equipmentNeeded || []);
        setMuscleGroups(parsedState.muscleGroups || []);
        setTags(parsedState.tags || []);
        setInstructions(parsedState.instructions || [{ step: 1, text: '' }]);
        setIsPublic(parsedState.isPublic || false);
        setCustomVideoUrl(parsedState.customVideoUrl || '');
        setNewEquipment(parsedState.newEquipment || '');
        setNewMuscleGroup(parsedState.newMuscleGroup || '');
        setNewTag(parsedState.newTag || '');
      } catch (error) {
        console.warn('Failed to restore form state:', error);
      }
    }
  }, [persistenceKey, isEditing]);

  // Clear saved form state when form is successfully submitted
  const clearFormState = () => {
    localStorage.removeItem(persistenceKey);
  };

  // Clear form and reset to initial state
  const handleClearForm = () => {
    if (confirm(t('exercises.confirmClearForm', 'Are you sure you want to clear the form? This will delete your draft.'))) {
      clearFormState();
      setName('');
      setDescription('');
      setCategory(Categories.CORE);
      setExerciseType(Types.TIME_BASED);
      setDefaultDuration('');
      setDefaultSets('');
      setDefaultReps('');
      setRepDurationSeconds('');
      setDifficultyLevel('beginner');
      setEquipmentNeeded([]);
      setMuscleGroups([]);
      setTags([]);
      setInstructions([{ step: 1, text: '' }]);
      setIsPublic(false);
      setCustomVideoUrl('');
      setNewEquipment('');
      setNewMuscleGroup('');
      setNewTag('');
    }
  };

  // Handle cancel with option to keep draft
  const handleCancel = () => {
    const hasContent = name.trim() || description.trim() || instructions.some(i => i.text.trim());
    if (hasContent) {
      const keepDraft = confirm(t('exercises.keepDraft', 'Keep your form draft for next time?'));
      if (!keepDraft) {
        clearFormState();
      }
    }
    onCancel();
  };

  const handleAddInstruction = () => {
    const newStep = instructions.length + 1;
    setInstructions([...instructions, { step: newStep, text: '' }]);
  };

  const handleUpdateInstruction = (index: number, instruction: ExerciseInstruction) => {
    const updated = [...instructions];
    updated[index] = instruction;
    setInstructions(updated);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) return; // Keep at least one instruction
    
    const updated = instructions.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = updated.map((inst, i) => ({ ...inst, step: i + 1 }));
    setInstructions(renumbered);
  };

  const handleMoveInstruction = (index: number, direction: 'up' | 'down') => {
    const updated = [...instructions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    // Swap instructions
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    // Renumber steps
    const renumbered = updated.map((inst, i) => ({ ...inst, step: i + 1 }));
    setInstructions(renumbered);
  };

  const handleAddArrayItem = (type: 'equipment' | 'muscleGroups' | 'tags', value: string) => {
    if (!value.trim()) return;
    
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'equipment':
        if (!equipmentNeeded.includes(trimmedValue)) {
          setEquipmentNeeded([...equipmentNeeded, trimmedValue]);
        }
        setNewEquipment('');
        break;
      case 'muscleGroups':
        if (!muscleGroups.includes(trimmedValue)) {
          setMuscleGroups([...muscleGroups, trimmedValue]);
        }
        setNewMuscleGroup('');
        break;
      case 'tags':
        if (!tags.includes(trimmedValue)) {
          setTags([...tags, trimmedValue]);
        }
        setNewTag('');
        break;
    }
  };

  const handleRemoveArrayItem = (type: 'equipment' | 'muscleGroups' | 'tags', index: number) => {
    switch (type) {
      case 'equipment':
        setEquipmentNeeded(equipmentNeeded.filter((_, i) => i !== index));
        break;
      case 'muscleGroups':
        setMuscleGroups(muscleGroups.filter((_, i) => i !== index));
        break;
      case 'tags':
        setTags(tags.filter((_, i) => i !== index));
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      return;
    }
    
    // Filter out empty instructions
    const validInstructions = instructions
      .filter(inst => inst.text.trim())
      .map((inst, i) => ({ ...inst, step: i + 1 }));
    
    const exerciseData: Partial<Exercise> = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      exercise_type: exerciseType,
      instructions: validInstructions.length > 0 ? validInstructions : undefined,
      difficulty_level: difficultyLevel,
      equipment_needed: equipmentNeeded.length > 0 ? equipmentNeeded : undefined,
      muscle_groups: muscleGroups.length > 0 ? muscleGroups : undefined,
      tags: tags.length > 0 ? tags : undefined,
      is_public: isPublic,
    };

    // Add type-specific fields
    if (exerciseType === Types.TIME_BASED) {
      if (defaultDuration) {
        exerciseData.default_duration = parseInt(defaultDuration, 10);
      }
    } else {
      if (defaultSets) {
        exerciseData.default_sets = parseInt(defaultSets, 10);
      }
      if (defaultReps) {
        exerciseData.default_reps = parseInt(defaultReps, 10);
      }
      if (repDurationSeconds) {
        exerciseData.rep_duration_seconds = parseInt(repDurationSeconds, 10);
      }
    }

    // Add video URL if provided
    if (customVideoUrl.trim()) {
      exerciseData.custom_video_url = customVideoUrl.trim();
    }

    // Clear saved form state on successful submission
    clearFormState();
    onSubmit(exerciseData);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.basicInfo', 'Basic Information')}</h3>
            
            <div>
              <label htmlFor="exercise-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('exercises.name', 'Exercise Name')} *
              </label>
              <input
                id="exercise-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('exercises.namePlaceholder', 'Enter exercise name')}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="exercise-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('exercises.description', 'Description')}
              </label>
              <textarea
                id="exercise-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder={t('exercises.descriptionPlaceholder', 'Brief description of the exercise')}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="exercise-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exercises.category', 'Category')} *
                </label>
                <select
                  id="exercise-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                  disabled={loading}
                >
                  {Object.values(Categories).map(cat => (
                    <option key={cat} value={cat}>
                      {t(`exercises.categories.${cat}`, cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="exercise-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exercises.type', 'Type')} *
                </label>
                <select
                  id="exercise-type"
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                  disabled={loading}
                >
                  <option value={Types.TIME_BASED}>
                    {t('exercises.types.time_based', 'Time Based')}
                  </option>
                  <option value={Types.REPETITION_BASED}>
                    {t('exercises.types.repetition_based', 'Repetition Based')}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="exercise-difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('exercises.difficultyLevel', 'Difficulty')}
              </label>
              <select
                id="exercise-difficulty"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                <option value="beginner">{t('exercises.difficulties.beginner', 'Beginner')}</option>
                <option value="intermediate">{t('exercises.difficulties.intermediate', 'Intermediate')}</option>
                <option value="advanced">{t('exercises.difficulties.advanced', 'Advanced')}</option>
              </select>
            </div>
          </div>

          {/* Type-specific fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise Parameters</h3>
            {exerciseType === Types.TIME_BASED ? (
              <div>
                <label htmlFor="default-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('exercises.durationSeconds', 'Duration (seconds)')}
                </label>
                <input
                  id="default-duration"
                  type="number"
                  min="1"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="30"
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="default-sets" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('exercises.defaultSets', 'Default Sets')}
                  </label>
                  <input
                    id="default-sets"
                    type="number"
                    min="1"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="3"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="default-reps" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('exercises.defaultReps', 'Default Reps')}
                  </label>
                  <input
                    id="default-reps"
                    type="number"
                    min="1"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="10"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="rep-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('exercises.repDuration', 'Rep Duration (seconds)')}
                  </label>
                  <input
                    id="rep-duration"
                    type="number"
                    min="1"
                    value={repDurationSeconds}
                    onChange={(e) => setRepDurationSeconds(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="2"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instructions Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.instructions', 'Instructions')}</h3>
              <button
                type="button"
                onClick={handleAddInstruction}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                {t('exercises.addStep', 'Add Step')}
              </button>
            </div>
            
            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <InstructionItem
                  key={index}
                  instruction={instruction}
                  index={index}
                  onUpdate={handleUpdateInstruction}
                  onRemove={handleRemoveInstruction}
                  onMoveUp={(i) => handleMoveInstruction(i, 'up')}
                  onMoveDown={(i) => handleMoveInstruction(i, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < instructions.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Equipment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.equipment', 'Equipment Needed')}</h3>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('exercises.equipmentPlaceholder', 'e.g., Dumbbells, Yoga Mat')}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddArrayItem('equipment', newEquipment);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('equipment', newEquipment)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || !newEquipment.trim()}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              
              {equipmentNeeded.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {equipmentNeeded.map((item, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('equipment', index)}
                        className="ml-1 inline-flex items-center p-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        disabled={loading}
                      >
                        <MinusIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Muscle Groups Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.muscleGroups', 'Muscle Groups')}</h3>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMuscleGroup}
                  onChange={(e) => setNewMuscleGroup(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('exercises.muscleGroupPlaceholder', 'e.g., Arms, Core, Legs')}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddArrayItem('muscleGroups', newMuscleGroup);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('muscleGroups', newMuscleGroup)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || !newMuscleGroup.trim()}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              
              {muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {muscleGroups.map((group, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {group}
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('muscleGroups', index)}
                        className="ml-1 inline-flex items-center p-0.5 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                        disabled={loading}
                      >
                        <MinusIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.tags', 'Tags')}</h3>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('exercises.tagPlaceholder', 'e.g., beginner, quick, home')}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddArrayItem('tags', newTag);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('tags', newTag)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || !newTag.trim()}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveArrayItem('tags', index)}
                        className="ml-1 inline-flex items-center p-0.5 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                        disabled={loading}
                      >
                        <MinusIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Video Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Exercise Video</h3>
            {exercise?.id ? (
              <VideoUploadWidget
                exerciseId={exercise.id}
                currentVideoUrl={customVideoUrl}
                onVideoUploaded={setCustomVideoUrl}
              />
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('common.videoUploadAfterSave', 'Video upload will be available after saving the exercise.')}
                </p>
              </div>
            )}
          </div>

          {/* Sharing Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('exercises.sharing', 'Sharing Options')}</h3>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={loading}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('exercises.makePublic', 'Make this exercise publicly available')}
                </span>
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('exercises.publicHelp', 'Public exercises can be discovered and copied by other users.')}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                  disabled={loading}
                >
                  {t('exercises.clearDraft', 'Clear Draft')}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {t('common.cancel', 'Cancel')}
              </button>
            
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !name.trim()}
              >
                {loading 
                  ? t('common.saving', 'Saving...') 
                  : isEditing 
                    ? t('common.saveChanges', 'Save Changes')
                    : t('exercises.createExercise', 'Create Exercise')
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};