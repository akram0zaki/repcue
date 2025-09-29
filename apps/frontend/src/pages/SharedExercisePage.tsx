import React from 'react';
import StandaloneSharedExerciseApp from '../StandaloneSharedExercise';

/**
 * SharedExercisePage - Component for viewing shared exercises
 * This is a page wrapper around the StandaloneSharedExercise component
 * for use within the main application routing system.
 */
const SharedExercisePage: React.FC = () => {
  return <StandaloneSharedExerciseApp />;
};

export default SharedExercisePage;