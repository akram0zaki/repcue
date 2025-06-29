import type { Exercise } from '../types';

interface ExercisePageProps {
  exercises: Exercise[];
  onToggleFavorite: (exerciseId: string) => void;
}

const ExercisePage: React.FC<ExercisePageProps> = ({ exercises }) => {
  return (
    <div id="main-content" className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4 max-w-md">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Exercise browser coming soon... ({exercises.length} exercises available)
        </p>
      </div>
    </div>
  );
};

export default ExercisePage; 