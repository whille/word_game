// App.tsx — Root component. Loads level, initializes game, renders GameShell.
import { useEffect, useState } from 'react';
import { GameShell } from './ui/GameShell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { LevelLoadError } from './ui/LevelLoadError';
import { useGameStore } from './store/gameStore';
import { loadLevel } from './data/schema';
import type { Level } from './engine/types';

// Import tutorial level statically
import tutorialData from './data/levels/tutorial.json';

export default function App() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const initGame = useGameStore(s => s.initGame);

  useEffect(() => {
    const result = loadLevel(tutorialData);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    initGame(result.level as Level);
  }, [initGame]);

  if (loadError) {
    return (
      <LevelLoadError
        error={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GameShell />
    </ErrorBoundary>
  );
}
