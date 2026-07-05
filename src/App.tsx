import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export const SafeChessboard = (props: any) => {
  const [boardWidth, setBoardWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setBoardWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minWidth: 200 }}>
      {boardWidth > 0 && <Chessboard boardWidth={boardWidth} {...props} />}
    </div>
  );
};
import {
  RotateCcw, Activity, Trophy, Flame, LogOut,
  BrainCircuit, User as UserIcon, X, Moon, Sun, Download
} from 'lucide-react';
import { auth, db, logout, handleFirestoreError, OperationType } from './firebase';
import type { User } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { getAICoachTip, analyzePgnAndExpandRepertoire } from './gemini';
import { useStockfish } from './useStockfish';
import { getSrsState, recordDrillResult, isDue } from './utils/srs';
import { repertoire, type RepertoireLine } from './data/repertoire';
import { EndgameDojo } from './EndgameDojo';
import { EngineLab } from './EngineLab';
import { Autopsy } from './Autopsy';
import type { ChessComGame } from './data/chessGameStore';

// ==========================================
// CHESSai Core Types & Constants
// ==========================================
type Section = "opening" | "middlegame" | "endgame" | "autopsy" | "engineLab";
export type Theme = "dark" | "light";

const STORAGE_KEYS = {
  ACTIVE_SECTION: "chessai_active_section",
  THEME: "chessai_theme",
  OPENING_REPERTOIRE: "chessai_opening_repertoire",
  MIDDLEGAME_SCENARIOS: "chessai_middlegame_scenarios",
  ENDGAME_DRILLS: "chessai_endgame_drills",
  STREAK: "chessai_streak",
  CALIBRATED_ELO: "chessai_calibrated_elo",
  STREAK_ELO: "chessai_streak_elo",
};

const SECTIONS: {
  id: Section;
  label: string;
  shortLabel: string;
  subtitle: string;
  phase: string;
}[] = [
  {
    id: "opening",
    label: "Opening",
    shortLabel: "Open",
    subtitle: "Opening Blueprint 3.0 · Gentleman Assassin System",
    phase: "Phase 1",
  },
  {
    id: "middlegame",
    label: "Middlegame",
    shortLabel: "Mid",
    subtitle: "Hikaru Mode · Plans, tactics, compensation, pattern recognition",
    phase: "Phase 2",
  },
  {
    id: "endgame",
    label: "Endgame",
    shortLabel: "End",
    subtitle: "Carlsen Mode · Technique, conversion, tablebase truth later",
    phase: "Phase 2",
  },
  {
    id: "autopsy",
    label: "Autopsy",
    shortLabel: "Auto",
    subtitle: "Game review · Diagnose opening, middlegame, and endgame mistakes",
    phase: "Phase 3",
  },
  {
    id: "engineLab",
    label: "Engine Lab",
    shortLabel: "Lab",
    subtitle: "Caruana Lab · Stockfish, LCZero, Maia, Syzygy later",
    phase: "Phase 4",
  },
];

// ==========================================
// Opening Blueprint 3.0 Helpers
// ==========================================
const getBelt = (sessions: number) => {
  if (sessions < 20) return { name: 'White Belt', color: 'text-[#E2E8F0]', bg: 'bg-[#E2E8F0]', border: 'border-[#E2E8F0]', hex: '#E2E8F0', boardHex: '#666666', nextThreshold: 20 };
  if (sessions < 40) return { name: 'Blue Belt', color: 'text-[#7DE2FF]', bg: 'bg-[#7DE2FF]', border: 'border-[#7DE2FF]', hex: '#7DE2FF', boardHex: '#4B8899', nextThreshold: 40 };
  if (sessions < 70) return { name: 'Purple Belt', color: 'text-[#D47DFF]', bg: 'bg-[#D47DFF]', border: 'border-[#D47DFF]', hex: '#D47DFF', boardHex: '#7F4B99', nextThreshold: 70 };
  if (sessions < 100) return { name: 'Brown Belt', color: 'text-[#C88A5E]', bg: 'bg-[#C88A5E]', border: 'border-[#C88A5E]', hex: '#C88A5E', boardHex: '#A36840', nextThreshold: 100 };
  if (sessions < 217) return { name: 'Black Belt', color: 'text-[#515151]', bg: 'bg-[#515151]', border: 'border-[#515151]', hex: '#515151', boardHex: '#222222', nextThreshold: 217 };
  if (sessions < 334) return { name: 'Black Belt (1 Stripe)', color: 'text-[#515151]', bg: 'bg-white', border: 'border-[2px] border-[#515151]', hex: '#515151', boardHex: '#222222', nextThreshold: 334, customStyle: {} };
  if (sessions < 640) return { name: 'Black Belt (2 Stripes)', color: 'text-[#515151]', bg: 'bg-[#515151]', border: 'border-[#515151]', hex: '#515151', boardHex: '#222222', nextThreshold: 640, customStyle: { background: 'linear-gradient(90deg, #515151 25%, white 25%, white 40%, #515151 40%, #515151 60%, white 60%, white 75%, #515151 75%)' } };
  if (sessions < 1000) return { name: 'Black Belt (3 Stripes)', color: 'text-[#515151]', bg: 'bg-[#515151]', border: 'border-[#515151]', hex: '#515151', boardHex: '#222222', nextThreshold: 1000, customStyle: { background: 'linear-gradient(90deg, #515151 15%, white 15%, white 28%, #515151 28%, #515151 43%, white 43%, white 57%, #515151 57%, #515151 72%, white 72%, white 85%, #515151 85%)' } };
  return { name: 'Red Belt', color: 'text-[#FF7D7D]', bg: 'bg-[#FF7D7D]', border: 'border-[#FF7D7D]', hex: '#FF7D7D', boardHex: '#8C3B3B', nextThreshold: null };
};

const BELT_TIERS: Record<string, number> = {
  'White Belt': 0,
  'Blue Belt': 1,
  'Purple Belt': 2,
  'Brown Belt': 3,
  'Black Belt': 4,
  'Black Belt (1 Stripe)': 5,
  'Black Belt (2 Stripes)': 6,
  'Black Belt (3 Stripes)': 7,
  'Red Belt': 8
};

const getGameEloTitle = (rating: number) => {
  if (rating < 600) return 'White Belt';
  if (rating < 1000) return 'Blue Belt';
  if (rating < 1500) return 'Purple Belt';
  if (rating < 2000) return 'Brown Belt';
  if (rating < 2065) return 'Black Belt';
  if (rating < 2130) return 'Black Belt (1 Stripe)';
  if (rating < 2300) return 'Black Belt (2 Stripes)';
  if (rating < 2500) return 'Black Belt (3 Stripes)';
  return 'Red Belt';
};

const getGameEloColor = (rating: number) => {
  if (rating < 600) return 'text-[#E2E8F0]';
  if (rating < 1000) return 'text-[#7DE2FF]';
  if (rating < 1500) return 'text-[#D47DFF]';
  if (rating < 2000) return 'text-[#C88A5E]';
  if (rating < 2500) return 'text-[#515151]';
  return 'text-[#FF7D7D]';
};

const getEloFromSessions = (sessions: number) => {
  if (sessions <= 0) return 400;
  if (sessions < 20) return Math.floor(400 + (sessions / 20) * 200);
  if (sessions < 40) return Math.floor(600 + ((sessions - 20) / 20) * 400);
  if (sessions < 70) return Math.floor(1000 + ((sessions - 40) / 30) * 500);
  if (sessions < 100) return Math.floor(1500 + ((sessions - 70) / 30) * 500);
  if (sessions < 1000) return Math.floor(2000 + ((sessions - 100) / 900) * 500);
  return Math.floor(2500 + (sessions - 1000) * 10);
};

const getLightBeltGradient = (beltName: string) => {
  switch (beltName) {
    case 'White Belt':
      return 'linear-gradient(to top right, #f8fafc 0%, #e2e8f0 25%, #e2e8f0 75%, #7DE2FF 100%)';
    case 'Blue Belt':
      return 'linear-gradient(to top right, #f1f5f9 0%, #7DE2FF 50%, #D47DFF 100%)';
    case 'Purple Belt':
      return 'linear-gradient(to top right, #e0f2fe 0%, #D47DFF 50%, #C88A5E 100%)';
    case 'Brown Belt':
      return 'linear-gradient(to top right, #f3e8ff 0%, #C88A5E 50%, #d1d5db 100%)';
    case 'Black Belt':
    case 'Black Belt (1 Stripe)':
    case 'Black Belt (2 Stripes)':
    case 'Black Belt (3 Stripes)':
      return 'linear-gradient(to top right, #fef3c7 0%, #d1d5db 50%, #515151 100%)';
    case 'Red Belt':
    case 'Coral Belt':
      return 'linear-gradient(to top right, #f3f4f6 0%, #FF7D7D 50%, #FF7D7D 100%)';
    default:
      return 'linear-gradient(to top right, #f8fafc 0%, #e2e8f0 50%, #7DE2FF 100%)';
  }
};

const getBeltGradient = (beltName: string) => {
  switch (beltName) {
    case 'White Belt':
      return 'linear-gradient(to top right, #ffffff 0%, #E2E8F0 25%, #E2E8F0 75%, #7DE2FF 100%)';
    case 'Blue Belt':
      return 'linear-gradient(to top right, #ffffff 0%, #7DE2FF 25%, #7DE2FF 75%, #D47DFF 100%)';
    case 'Purple Belt':
      return 'linear-gradient(to top right, #7DE2FF 0%, #D47DFF 25%, #D47DFF 75%, #C88A5E 100%)';
    case 'Brown Belt':
      return 'linear-gradient(to top right, #D47DFF 0%, #C88A5E 25%, #C88A5E 75%, #515151 100%)';
    case 'Black Belt':
    case 'Black Belt (1 Stripe)':
    case 'Black Belt (2 Stripes)':
    case 'Black Belt (3 Stripes)':
      return 'linear-gradient(to top right, #C88A5E 0%, #515151 25%, #515151 75%, #FF7D7D 100%)';
    case 'Red Belt':
    case 'Coral Belt':
      return 'linear-gradient(to top right, #515151 0%, #FF7D7D 25%, #FF7D7D 75%, #FF7D7D 100%)';
    default:
      return 'linear-gradient(to top right, #ffffff 0%, #ffffff 40%, #ffffff 60%, #7DE2FF 100%)';
  }
};

const formatTitle = (name: string) => {
  const match = name.match(/^(.*?)\s*\((.*)\)$/);
  return match ? match[1] : name;
};

const formatSubtitle = (name: string, description?: string) => {
  const match = name.match(/^(.*?)\s*\((.*)\)$/);
  return match ? match[2] : description;
};

// ==========================================
// CHESSai Shell Helpers
// ==========================================
function getInitialSection(): Section {
  const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SECTION) as Section | null;
  if (
    saved === "opening" ||
    saved === "middlegame" ||
    saved === "endgame" ||
    saved === "autopsy" ||
    saved === "engineLab"
  ) {
    return saved;
  }
  return "opening";
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
  return saved === "light" ? "light" : "dark";
}

// ==========================================
// Opening Blueprint 3.0 Real Component
// ==========================================
function OpeningPhaseOne({ theme, setTheme }: { theme: Theme, setTheme: (t: Theme) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [repertoireState, setRepertoireState] = useState<RepertoireLine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPENING_REPERTOIRE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RepertoireLine[];
        const merged = repertoire.map(defaultOp => {
          const savedOp = parsed.find(p => p.id === defaultOp.id);
          return savedOp ? {
            ...defaultOp,
            coverImage: savedOp.coverImage || defaultOp.coverImage,
            attempts: Math.max(defaultOp.attempts || 0, savedOp.attempts || 0),
            perfectSessions: Math.max(defaultOp.perfectSessions || 0, savedOp.perfectSessions || 0)
          } : { ...defaultOp };
        });

        const customLines = parsed.filter(p => {
          if (repertoire.some(defaultOp => defaultOp.id === p.id)) return false;
          if (p.name.includes('Shut Down') || p.name.startsWith('DRILL:')) return false;
          if (p.id.includes('-shutdown') || p.id.startsWith('drill-')) return false;
          if (p.id === 'strangler') return false;
          if (p.name === 'TRAP: Fried Liver' && p.description.includes('4.c3!')) return false;
          if (p.name === 'TRAP: Traxler' && p.description.includes('4.d3 Bc5')) return false;
          if (p.name === 'TRAP: Two Knights' && p.description === '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3') return false;
          return true;
        });
        return [...merged, ...customLines];
      } catch (e) {
        return repertoire;
      }
    }
    return repertoire;
  });
  const [streak, setStreak] = useState<number>(() => {
    const savedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
    return savedStreak ? parseInt(savedStreak, 10) : 1;
  });
  const [rating, setRating] = useState<number>(1200);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiCoachTip, setAiCoachTip] = useState<string | null>(null);
  const [isGettingTip, setIsGettingTip] = useState(false);
  const [game, setGame] = useState(new Chess());
  const [currentOpening, setCurrentOpening] = useState<RepertoireLine>(repertoireState[0]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'idle' | 'success' | 'error' | 'completed', message: string }>({ type: 'idle', message: 'Make your first move.' });
  const [currentErrors, setCurrentErrors] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [trainingMode, setTrainingMode] = useState<'single' | 'all' | 'white' | 'black'>('single');
  const [selectedColorTab, setSelectedColorTab] = useState<'white' | 'black' | 'all'>('white');
  const [leftPanelTab, setLeftPanelTab] = useState<'list' | 'timer'>('list');
  const [activeLines, setActiveLines] = useState<RepertoireLine[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [importPgn, setImportPgn] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [gameMode, setGameMode] = useState<'drill' | 'play_build' | 'play_live'>('drill');
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [botElo, setBotElo] = useState(400);
  const [srsMap, setSrsMap] = useState<Record<string, { level: number; nextReview: string | null }>>(() => {
    const m: Record<string, { level: number; nextReview: string | null }> = {};
    repertoireState.forEach((l) => { m[l.id] = getSrsState(l.id); });
    return m;
  });
  const [calibratedElo, setCalibratedElo] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CALIBRATED_ELO);
    return saved ? parseInt(saved, 10) : null;
  });
  const [currentWinStreakElo, setCurrentWinStreakElo] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STREAK_ELO);
    return saved ? parseInt(saved, 10) : 400;
  });
  const { isReady: isStockfishReady, findBestMove, bestMove } = useStockfish();

  const handleGameEnd = useCallback((result: 'win' | 'loss' | 'draw') => {
    if (calibratedElo === null) {
      if (result === 'win') {
        const nextStreak = currentWinStreakElo + 100;
        setCurrentWinStreakElo(nextStreak);
        localStorage.setItem(STORAGE_KEYS.STREAK_ELO, nextStreak.toString());
      } else {
        setCalibratedElo(botElo);
        localStorage.setItem(STORAGE_KEYS.CALIBRATED_ELO, botElo.toString());
      }
    } else {
      if (result === 'win') {
        const nextElo = calibratedElo + 50;
        setCalibratedElo(nextElo);
        localStorage.setItem(STORAGE_KEYS.CALIBRATED_ELO, nextElo.toString());
      } else if (result === 'loss') {
        const nextElo = Math.max(400, calibratedElo - 25);
        setCalibratedElo(nextElo);
        localStorage.setItem(STORAGE_KEYS.CALIBRATED_ELO, nextElo.toString());
      }
    }
  }, [calibratedElo, botElo, currentWinStreakElo]);

  const startGame = (elo: number) => {
    setBotElo(elo);
    setShowBotMenu(false);
    setLeftPanelTab('timer');

    const highestPerfectSessions = Math.max(0, ...repertoireState.map(op => op.perfectSessions || 0));
    const highestBeltName = getBelt(highestPerfectSessions).name;
    const botTier = BELT_TIERS[getGameEloTitle(elo)];
    const userTier = BELT_TIERS[highestBeltName];

    if (botTier < userTier) {
      setTheme('light');
    } else if (botTier > userTier) {
      setTheme('dark');
    }

    const newGame = new Chess();
    const lineMoves = currentOpening.moves;
    const movesToPlay = lineMoves.length;

    for (let i = 0; i < movesToPlay; i++) {
        try {
            newGame.move(lineMoves[i]);
        } catch (e) {
            console.error("Invalid predefined move:", lineMoves[i]);
            break;
        }
    }

    setGameMode('play_live');
    setGame(newGame);
    setMoveIndex(movesToPlay);
    setFeedback({ type: 'success', message: `Cage Built. VS Stockfish (${elo} Elo)` });
  };

  useEffect(() => {
    setRepertoireState(prev => {
      if (prev.some(p => p.id === 'strangler')) {
        return prev.filter(p => p.id !== 'strangler');
      }
      return prev;
    });
  }, []);

  // Local Stub Auth
  useEffect(() => {
    setUser({
      uid: 'local',
      displayName: 'Chess Player',
      email: 'guest@example.com'
    } as User);
    setIsAuthReady(true);
  }, []);

  // CHESSai local-mode initializer.
  // Firebase is stubbed in Phase 1, so we must initialize the first training line locally.
  useEffect(() => {
    if (repertoireState.length > 0 && activeLines.length === 0) {
      const firstLine = repertoireState[0];
      setCurrentOpening(firstLine);
      setActiveLines([firstLine]);

      try {
        const startingGame = firstLine.startFen ? new Chess(firstLine.startFen) : new Chess();
        setGame(startingGame);
      } catch (e) {
        setGame(new Chess());
      }

      setMoveIndex(0);
      setFeedback({ type: 'idle', message: 'Make your first move.' });
    }
  }, [repertoireState, activeLines.length]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPENING_REPERTOIRE, JSON.stringify(repertoireState));
  }, [repertoireState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STREAK, streak.toString());
  }, [streak]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Ignore if audio context fails
    }
  }, []);

  const resetTrainer = useCallback((opening?: RepertoireLine, mode: 'single' | 'all' | 'white' | 'black' = 'single', targetGameMode: 'drill' | 'play_build' | 'play_live' = 'drill') => {
    let targetLines = repertoireState;
    if (mode === 'black') {
      targetLines = repertoireState.filter(op => op.playerColor === 'black');
    } else if (mode === 'white') {
      targetLines = repertoireState.filter(op => op.playerColor !== 'black');
    }

    let initialOp = opening || currentOpening;
    if ((mode === 'white' || mode === 'black' || mode === 'all') && targetLines.length > 0) {
      initialOp = targetLines[0];
    }

    const targetId = initialOp.id;
    const freshOp = repertoireState.find(r => r.id === targetId) || initialOp;

    let newGame;
    try {
      newGame = freshOp.startFen ? new Chess(freshOp.startFen) : new Chess();
    } catch (e) {
      console.warn("Invalid startFen", e);
      newGame = new Chess();
    }

    setGameMode(targetGameMode);
    setGame(newGame);
    setMoveIndex(0);
    setFeedback({ type: 'idle', message: 'Make your first move.' });
    setCurrentErrors(0);
    setSessionCompleted(false);
    setAiCoachTip(null);
    setTrainingMode(mode);
    setTimeLimit(30);
    setTimeLeft(30);
    setIsTimerRunning(false);

    if (mode === 'all' || mode === 'white' || mode === 'black') {
      setActiveLines(targetLines);
      if (targetLines.length > 0) setCurrentOpening(targetLines[0]);
    } else {
      setCurrentOpening(freshOp);
      setActiveLines([freshOp]);
    }
  }, [currentOpening, repertoireState]);

  const completeSession = useCallback(() => {
    if (sessionCompleted) return;
    setSessionCompleted(true);
    setIsTimerRunning(false);
    const isPerfect = currentErrors === 0 && timeLeft > 0;
    setFeedback({
      type: 'completed',
      message: isPerfect ? 'Perfect session! +1 to mastery.' : 'Line completed! Try for a perfect run next time.'
    });

    // SRS: score every active line against the drill result. Additive to the
    // existing perfectSessions/belt system below, not a replacement for it.
    setSrsMap((prev) => {
      const next = { ...prev };
      activeLines.forEach((line) => {
        next[line.id] = recordDrillResult(line.id, isPerfect);
      });
      return next;
    });

    setRepertoireState(prev => {
      const newRep = [...prev];
      activeLines.forEach(line => {
        const index = newRep.findIndex(op => op.id === line.id);
        if (index !== -1) {
          const currentOp = newRep[index];
          const updatedOpening = {
            ...currentOp,
            perfectSessions: (currentOp.perfectSessions || 0) + (isPerfect ? 1 : 0)
          };
          newRep[index] = updatedOpening;

          if (user && user.uid !== 'local') {
            const opRef = doc(db, `users/${user.uid}/repertoire`, updatedOpening.id);
            const dataToSave = { ...updatedOpening };
            if (dataToSave.theory === undefined) delete dataToSave.theory;
            setDoc(opRef, dataToSave, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, opRef.path));
          }
        }
      });
      return newRep;
    });
  }, [sessionCompleted, currentErrors, activeLines, user, timeLeft]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0 && !sessionCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !sessionCompleted) {
      setIsTimerRunning(false);
      setCurrentErrors(prev => prev + 1);
      setFeedback({ type: 'error', message: 'Time is up!' });
      playBeep();
      completeSession();
      setTimeout(() => {
        setTimeLimit(30);
        setTimeLeft(30);
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, sessionCompleted, completeSession, playBeep]);

  useEffect(() => {
    if (!user || user.uid === 'local') return;

    const repRef = collection(db, `users/${user.uid}/repertoire`);
    const unsubscribe = onSnapshot(repRef, (snapshot) => {
      const fetchedRep: RepertoireLine[] = [];
      snapshot.forEach(doc => {
        fetchedRep.push(doc.data() as RepertoireLine);
      });
      if (fetchedRep.length > 0) {
        const merged = repertoire.map(defaultOp => {
          const fetchedOp = fetchedRep.find(p => p.id === defaultOp.id);
          return fetchedOp ? {
            ...fetchedOp,
            name: defaultOp.name,
            description: defaultOp.description,
            ...(defaultOp.theory ? { theory: defaultOp.theory } : {}),
            ...(defaultOp.startFen ? { startFen: defaultOp.startFen } : {}),
            ...(defaultOp.playerColor ? { playerColor: defaultOp.playerColor } : {}),
            moves: defaultOp.moves,
            attempts: Math.max(defaultOp.attempts || 0, fetchedOp.attempts || 0),
            perfectSessions: Math.max(defaultOp.perfectSessions || 0, fetchedOp.perfectSessions || 0)
          } : { ...defaultOp };
        });

        const customLines = fetchedRep.filter(p => {
          if (repertoire.some(r => r.id === p.id)) return false;
          if (p.name.includes('Shut Down') || p.name.startsWith('DRILL:')) return false;
          if (p.id.includes('-shutdown') || p.id.startsWith('drill-')) return false;
          if (p.name === 'TRAP: Fried Liver' && p.description.includes('4.c3!')) return false;
          if (p.name === 'TRAP: Traxler' && p.description.includes('4.d3 Bc5')) return false;
          if (p.name === 'TRAP: Two Knights' && p.description === '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3') return false;
          return true;
        });
        setRepertoireState([...merged, ...customLines]);
      }
    }, (error) => {
      console.error("Error fetching repertoire:", error);
    });

    if (repertoireState.length > 0 && activeLines.length === 0) {
      resetTrainer(repertoireState[0], 'single');
    }

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const playerColor = currentOpening.playerColor || 'white';
    const isOpponentTurn = playerColor === 'black' ? game.turn() === 'w' : game.turn() === 'b';

    if (gameMode === 'play_live' && isOpponentTurn && bestMove) {
      const gameCopy = new Chess(game.fen());
      try {
        gameCopy.move({
          from: bestMove.substring(0, 2),
          to: bestMove.substring(2, 4),
          promotion: bestMove.length > 4 ? bestMove[4] : 'q'
        });
        setGame(gameCopy);
        setMoveIndex(prev => prev + 1);
        if (gameCopy.isGameOver()) {
          if (gameCopy.isCheckmate()) {
            handleGameEnd('loss');
            setFeedback({ type: 'completed', message: `CHECKMATE` });
            setSessionCompleted(true);
            setIsTimerRunning(false);
          } else {
            handleGameEnd('draw');
            setFeedback({ type: 'completed', message: `DRAW` });
            setSessionCompleted(true);
            setIsTimerRunning(false);
          }
        } else {
          setFeedback({ type: 'idle', message: 'Your turn.' });
        }
      } catch (e) {
        console.error("Invalid move from stockfish", bestMove);
      }
    }
  }, [bestMove, game, gameMode, currentOpening.playerColor]);

  useEffect(() => {
    const playerColor = activeLines[0]?.playerColor || 'white';
    const expectedTurnColor = playerColor === 'white' ? 'b' : 'w';
    const isOpponentTurn = game.turn() === expectedTurnColor;

    if (isOpponentTurn && !sessionCompleted) {
      if (gameMode === 'play_live') {
        if (!game.isGameOver()) {
          findBestMove(game.fen(), botElo);
        }
        return;
      }

      const possibleOpponentMoves = Array.from(new Set(activeLines.map(line => line.moves[moveIndex]).filter(Boolean)));

      if (possibleOpponentMoves.length > 0) {
        const timer = setTimeout(() => {
          const chosenMove = possibleOpponentMoves[Math.floor(Math.random() * possibleOpponentMoves.length)];
          const nextLines = activeLines.filter(line => line.moves[moveIndex] === chosenMove);

          try {
            const gameCopy = new Chess(game.fen());
            gameCopy.move(chosenMove);
            setGame(gameCopy);
            setMoveIndex(moveIndex + 1);
            setActiveLines(nextLines);
            if (nextLines.length === 1) {
              setCurrentOpening(nextLines[0]);
            }
            setFeedback({ type: 'idle', message: 'Your turn.' });
          } catch (e) {
            console.error("Invalid move from opponent:", chosenMove, e);
            setFeedback({ type: 'error', message: `Invalid move in sequence: ${chosenMove}` });
          }
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [moveIndex, activeLines, game, sessionCompleted, gameMode, botElo]);

  useEffect(() => {
    if (moveIndex > 0 && !sessionCompleted) {
      if (game.isGameOver()) {
        if (gameMode !== 'play_live') {
          completeSession();
        }
        return;
      }

      if (gameMode === 'play_build' && moveIndex >= Math.min(18, activeLines[0]?.moves.length || 18)) {
        setGameMode('play_live');
        setFeedback({ type: 'success', message: 'Cage Built. LIVE GAME!' });
        return;
      }

      if (gameMode === 'drill' || gameMode === 'play_build') {
        const hasMoreMoves = activeLines.some(line => line.moves.length > moveIndex);
        if (!hasMoreMoves) {
          completeSession();
        }
      }
    }
  }, [moveIndex, activeLines, sessionCompleted, completeSession, gameMode, game]);

  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    const pieceStr = piece;

    if (feedback.type === 'completed') return false;
    if (timeLeft === 0) return false;

    const playerColor = currentOpening.playerColor || 'white';
    const expectedTurnColor = playerColor === 'white' ? 'w' : 'b';
    const isUserTurn = game.turn() === expectedTurnColor;
    if (!isUserTurn) {
        setFeedback({ type: 'error', message: `Not your turn! It's ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.` });
        return false;
    }

    const gameCopy = new Chess(game.fen());
    let moveAttempt;

    try {
      const isPromotion = pieceStr && pieceStr[1].toLowerCase() === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1');
      moveAttempt = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined
      });
    } catch (e) {
      console.error("Move error:", e, { sourceSquare, targetSquare, pieceStr });
      setFeedback({ type: 'error', message: `Move Error: ${e instanceof Error ? e.message : String(e)}` });
      return false;
    }

    if (moveAttempt === null) {
      setFeedback({ type: 'error', message: 'Move attempt returned null' });
      return false;
    }

    if (gameMode === 'play_live') {
      setGame(gameCopy);
      setMoveIndex(moveIndex + 1);
      setFeedback({ type: 'idle', message: 'Waiting for opponent...' });
      if (gameCopy.isGameOver()) {
        if (gameCopy.isCheckmate()) {
          handleGameEnd('win');
          setFeedback({ type: 'completed', message: `CHECKMATE` });
          setSessionCompleted(true);
          setIsTimerRunning(false);
        } else {
          handleGameEnd('draw');
          setFeedback({ type: 'completed', message: `DRAW` });
          setSessionCompleted(true);
          setIsTimerRunning(false);
        }
      }
      return true;
    }

    const validLines = activeLines.filter(line => line.moves[moveIndex] === moveAttempt.san);

    if (validLines.length > 0) {
      setGame(gameCopy);
      setMoveIndex(moveIndex + 1);
      setActiveLines(validLines);
      if (validLines.length === 1) {
        setCurrentOpening(validLines[0]);
      }
      setFeedback({ type: 'success', message: 'Correct move!' });
      return true;
    } else {
      setCurrentErrors(prev => prev + 1);
      setFeedback({ type: 'error', message: 'Incorrect move. Try again.' });
      return false;
    }
  }

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const newVariation = await analyzePgnAndExpandRepertoire(importPgn);
      if (newVariation) {
        const newLine: RepertoireLine = {
          id: `imported-${Date.now()}`,
          name: newVariation.name,
          description: newVariation.description,
          moves: newVariation.moves,
          attempts: 0,
          perfectSessions: 0
        };
        const updatedRep = [...repertoireState, newLine];
        setRepertoireState(updatedRep);
        if (user && user.uid !== 'local') {
           const opRef = doc(db, `users/${user.uid}/repertoire`, newLine.id);
           await setDoc(opRef, newLine);
        }
        setShowImportModal(false);
        setImportPgn('');
        resetTrainer(newLine, 'single');
      } else {
        alert("Failed to analyze PGN. The AI could not determine a valid new variation.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to analyze PGN.");
    } finally {
      setIsImporting(false);
    }
  };

  const averageSessions = repertoireState.reduce((sum, op) => sum + (op.perfectSessions || 0), 0) / repertoireState.length;
  const totalPercentComplete = repertoireState.reduce((sum, op) => sum + Math.min(100, op.perfectSessions || 0), 0) / repertoireState.length;
  const elo = getEloFromSessions(averageSessions);
  const eloTitle = getGameEloTitle(elo);
  const eloColor = getGameEloColor(elo);
  const mastery = Math.round(totalPercentComplete);
  const currentBelt = getBelt(currentOpening.perfectSessions || 0);
  const highestPerfectSessions = Math.max(0, ...repertoireState.map(op => op.perfectSessions || 0));
  const highestBelt = getBelt(highestPerfectSessions);
  const currentSrs = srsMap[currentOpening.id] || { level: 0, nextReview: null };
  const currentSrsDue = currentSrs.level > 0 && isDue(currentSrs.nextReview);

  const handleDownloadBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chessai_')) {
          const val = localStorage.getItem(key);
          if (val) backupData[key] = val;
        }
      }

      const now = new Date();
      const backupObj = {
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        label: "Manual Safety Backup",
        version: "v0.1-opening-functional",
        data: backupData
      };

      const existingBackupsStr = localStorage.getItem('chessai_local_backups');
      let backups: any[] = [];
      if (existingBackupsStr) {
        try {
          backups = JSON.parse(existingBackupsStr);
        } catch (e) {}
      }

      backups.push(backupObj);
      backups.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (backups.length > 7) {
        backups = backups.slice(backups.length - 7);
      }

      localStorage.setItem('chessai_local_backups', JSON.stringify(backups));

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // format: YYYY-MM-DD-HHMM
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      a.download = `chessai-safety-backup-${year}-${month}-${day}-${hours}${minutes}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // setFeedback({ type: 'success', message: 'Safety backup downloaded.' }); // if we want to show it on board
      alert("Safety backup downloaded.");
    } catch (e) {
      console.error("Backup failed", e);
    }
  };

  if (!isAuthReady) {
    return <div className="h-full flex items-center justify-center text-white/50">Loading...</div>;
  }

  const getDynamicBeltColor = (belt: {name: string, color: string}) => {
    return theme === 'dark' && belt.name.includes('Black Belt') ? 'text-white' : belt.color;
  };

  return (
    <div className="h-full w-full flex flex-col font-sans relative transition-colors duration-500 overflow-hidden rounded-3xl">
      <div className={`absolute inset-0 pointer-events-none z-0 transition-all duration-1000 ${theme === 'dark' ? 'mix-blend-screen opacity-20' : 'mix-blend-normal opacity-[0.85]'}`} style={{
        background: theme === 'dark' ? getBeltGradient(currentBelt.name) : getLightBeltGradient(currentBelt.name)
      }} />
      {theme === 'dark' && (
        <div
          className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516483638261-f40af5ee22dd?q=80&w=2000&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      <div className="relative z-10 flex flex-col flex-grow h-full overflow-hidden p-4 lg:p-6 lg:pb-8 lg:px-8 gap-4 lg:gap-6 w-full">

        <main className="grid grid-cols-1 lg:grid-cols-[300px_1fr_160px] xl:grid-cols-[300px_1fr_220px] gap-4 lg:gap-6 flex-grow min-h-0 w-full relative z-10">

          <div className="hidden lg:flex flex-col gap-4 relative z-10 h-full w-full flex-shrink-0 lg:overflow-hidden lg:order-3">
            <div className={`rounded-xl border p-4 flex flex-col flex-grow min-h-0 overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
                <div className={`flex rounded-t-md overflow-hidden shrink-0 border border-b-0 ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-black/5 border-black/10'}`}>
                   <button
                      onClick={() => setLeftPanelTab('list')}
                      className={`flex-1 p-3 text-center font-bold text-sm tracking-wider transition-colors ${leftPanelTab === 'list' ? (theme === 'dark' ? 'bg-black/80 text-white border-t-2 border-t-white' : 'bg-white text-black border-t-2 border-t-black') : (theme === 'dark' ? 'text-white/50 hover:bg-black/40 opacity-70 border-t-2 border-t-transparent' : 'text-black/50 hover:bg-black/5 opacity-70 border-t-2 border-t-transparent')}`}
                   >
                     List <span className="font-mono ml-1 opacity-70">{gameMode === 'play_live' ? game.history().length : `${moveIndex}/${currentOpening.moves.length}`}</span>
                   </button>
                   <button
                      onClick={() => setLeftPanelTab('timer')}
                      className={`flex-1 p-3 text-center font-bold text-sm tracking-wider transition-colors ${leftPanelTab === 'timer' ? (theme === 'dark' ? 'bg-black/80 text-white border-t-2 border-t-white' : 'bg-white text-black border-t-2 border-t-black') : (theme === 'dark' ? 'text-white/50 hover:bg-black/40 opacity-70 border-t-2 border-t-transparent' : 'text-black/50 hover:bg-black/5 opacity-70 border-t-2 border-t-transparent')}`}
                   >
                     Timer
                   </button>
                </div>

                <div className={`flex flex-col border rounded-b-md shadow-lg overflow-hidden flex-grow min-h-0 ${theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white border-black/10 border-t-0'}`}>
                  {leftPanelTab === 'list' ? (
                    <div className={`flex-1 overflow-y-auto p-2 lg:p-3 custom-scrollbar flex flex-col gap-1 min-h-0 pt-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      {(() => {
                        const movesSrcRaw = gameMode === 'play_live' ? game.history() : currentOpening.moves;
                        const startFen = gameMode === 'play_live' ? null : currentOpening.startFen;
                        const actualStartingTurn = startFen ? startFen.split(' ')[1] : 'w';
                        const movesSrc = actualStartingTurn === 'b' ? ['...', ...movesSrcRaw] : movesSrcRaw;
                        const visualMoveIndex = actualStartingTurn === 'b' ? moveIndex + 1 : moveIndex;

                        return Array.from({ length: Math.ceil(movesSrc.length / 2) }).map((_, i) => {
                          const whiteMove = movesSrc[i * 2];
                          const blackMove = movesSrc[i * 2 + 1];
                          const isUserWhite = currentOpening.playerColor !== 'black';
                          const whitePlayed = visualMoveIndex > i * 2;
                          const whiteNext = visualMoveIndex === i * 2;
                          const whiteActive = visualMoveIndex === i * 2 + 1;
                          const blackPlayed = visualMoveIndex > i * 2 + 1;
                          const blackNext = visualMoveIndex === i * 2 + 1;
                          const blackActive = visualMoveIndex === i * 2 + 2;

                          const whiteVisible = gameMode === 'play_live' || (isUserWhite && whiteNext) || whitePlayed;
                          const blackVisible = gameMode === 'play_live' || (!isUserWhite && blackNext) || blackPlayed;

                          const whiteClass = !whiteVisible ? 'opacity-0' :
                                 (isUserWhite && whiteNext) ? (theme === 'dark' ? 'text-white opacity-100 drop-shadow-md' : 'text-black opacity-100 drop-shadow-md') :
                                 whiteActive ? 'text-blue-500 opacity-100' :
                                 (theme === 'dark' ? 'text-white opacity-40' : 'text-black opacity-40');

                          const blackClass = !blackVisible ? 'opacity-0' :
                                 (!isUserWhite && blackNext) ? (theme === 'dark' ? 'text-white opacity-100 drop-shadow-md' : 'text-black opacity-100 drop-shadow-md') :
                                 blackActive ? 'text-blue-500 opacity-100' :
                                 (theme === 'dark' ? 'text-white opacity-40' : 'text-black opacity-40');

                          return (
                            <div key={i} className={`flex text-base xl:text-lg py-1.5 xl:py-2 px-1 border-b hover:bg-black/5 transition-colors rounded items-center shrink-0 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}>
                              <div className={`w-8 text-right pr-2 text-xs xl:text-sm font-mono opacity-60 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>{i + 1}.</div>
                              <div className={`flex-1 pl-1 text-left font-semibold ${whiteClass}`}>
                                {whiteVisible ? (whiteMove || '') : ''}
                              </div>
                              <div className={`flex-1 pl-1 text-left font-semibold ${blackClass}`}>
                                {blackVisible ? (blackMove || '') : ''}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 min-h-0">
                       <button
                         onClick={() => {
                           const limits = [30, 60, 180, 300];
                           const currentIndex = limits.indexOf(timeLimit);
                           const nextIndex = (currentIndex + 1) % limits.length;
                           const val = limits[nextIndex];
                           setTimeLimit(val);
                           setTimeLeft(val);
                           setIsTimerRunning(false);
                         }}
                         className={`rounded-md border p-3 flex items-center justify-center gap-3 shadow-inner transition-colors w-full group ${theme === 'dark' ? 'bg-black/40 border-white/10 hover:bg-white/5' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
                       >
                          <span className={`text-2xl font-black tracking-widest ${timeLeft <= 10 && isTimerRunning ? 'text-red-500' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                          </span>
                       </button>

                       <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`flex-1 py-3 rounded text-sm font-bold uppercase tracking-widest transition-colors ${isTimerRunning ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : (theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/10 text-black hover:bg-black/20')}`}
                          >
                             {isTimerRunning ? 'Stop' : 'Start'}
                          </button>
                          <button
                            onClick={() => {
                               setIsTimerRunning(false);
                               setTimeLeft(timeLimit);
                            }}
                            className={`w-12 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-black/10 text-black/70 hover:text-black'}`}
                            title="Reset Timer"
                          >
                             <RotateCcw size={16} />
                          </button>
                       </div>
                    </div>
                  )}
                </div>
            </div>

            <div className={`flex flex-row items-center justify-between w-full mt-auto shrink-0 py-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
               <button
                  onClick={() => resetTrainer()}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Restart Board"
               >
                  <RotateCcw className="w-5 h-5 flex-shrink-0" />
               </button>
               <button
                  onClick={handleDownloadBackup}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Download Safety Backup"
               >
                  <Download className="w-5 h-5 flex-shrink-0" />
               </button>
               <button
                  onClick={() => setShowProfileModal(true)}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Profile"
               >
                  <UserIcon className="w-5 h-5 flex-shrink-0" />
               </button>
               <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Toggle Theme"
               >
                  {theme === 'dark' ? <Moon className="w-5 h-5 flex-shrink-0" /> : <Sun className="w-5 h-5 flex-shrink-0" />}
               </button>
            </div>
          </div>

          <div className={`rounded-xl border p-4 flex flex-col items-stretch relative overflow-hidden min-w-0 shadow-xl h-full lg:order-2 ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
            <div className="w-full flex-col relative z-20 h-full flex">
              <div className="w-full flex items-start justify-center flex-grow min-h-0">
                <div className="flex-1 flex justify-center items-center h-full min-h-0 min-w-0 w-full">
                  <div className={`w-full max-w-[min(100%,_70vh)] lg:max-w-[min(100%,_65vh)] aspect-square mx-auto border rounded-md shadow-xl overflow-hidden relative ${theme === 'dark' ? 'border-white/20' : 'border-black/20'}`}>
                    <div className="w-full h-full absolute inset-0">
                      <SafeChessboard
                        position={game.fen()}
                        onPieceDrop={onDrop}
                        boardOrientation={currentOpening.playerColor === 'black' ? 'black' : 'white'}
                        customDarkSquareStyle={{ backgroundColor: currentBelt.boardHex || currentBelt.hex }}
                        customLightSquareStyle={{ backgroundColor: theme === 'dark' ? '#f4f1ea' : '#f0f0f0' }}
                        animationDuration={200}
                        areArrowsAllowed={false}
                      />
                      {feedback.type === 'error' && !sessionCompleted && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-red-500/30 bg-black/90 px-6 py-2.5 text-center text-sm font-bold text-red-500 z-30 shadow-2xl backdrop-blur-md">
                          {feedback.message}
                        </div>
                      )}
                      {sessionCompleted && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                          <span className="text-white text-4xl md:text-6xl lg:text-7xl font-black drop-shadow-lg tracking-wider text-center" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
                            {gameMode === 'play_live' ? (
                              feedback.message === 'CHECKMATE' ? (game.turn() === (currentOpening.playerColor === 'black' ? 'b' : 'w') ? 'DEFEAT' : 'VICTORY') : 'DRAW'
                            ) : (
                              currentErrors === 0 ? 'PERFECT' : 'TRY AGAIN'
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div className={`flex flex-col gap-4 relative z-10 w-full h-full min-h-0 lg:overflow-hidden lg:order-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          <div className={`rounded-xl border p-4 flex flex-col flex-grow min-h-0 overflow-hidden shadow-xl h-full ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
            <div className="flex flex-col gap-2 mb-4 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedColorTab('white')} className={`bg-white text-black py-2 rounded-md font-black text-xs uppercase tracking-wider text-center shadow-sm hover:opacity-90 transition-opacity ${selectedColorTab === 'white' ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''}`}>
                  WHITE
                </button>
                <button onClick={() => setSelectedColorTab('black')} className={`bg-black text-white py-2 rounded-md font-black text-xs uppercase tracking-wider text-center border shadow-sm hover:opacity-90 transition-opacity ${selectedColorTab === 'black' ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''} ${theme === 'dark' ? 'border-white/20' : 'border-black/20'}`}>
                  BLACK
                </button>
              </div>
              <button className="w-full bg-[#8B4513] text-white py-2 rounded-md font-black text-xs uppercase tracking-wider text-center hover:bg-amber-900 transition-colors shadow-sm">
                FABIANO OPENS
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar flex-grow min-h-0">
              {[...repertoireState].filter(op => {
                if (selectedColorTab === 'all') return true;
                if (selectedColorTab === 'white') return op.playerColor !== 'black';
                if (selectedColorTab === 'black') return op.playerColor === 'black';
                return true;
              }).sort((a, b) => {
                const aElo = getEloFromSessions(a.perfectSessions || 0);
                const bElo = getEloFromSessions(b.perfectSessions || 0);
                if (bElo !== aElo) return bElo - aElo;
                if ((b.perfectSessions || 0) !== (a.perfectSessions || 0)) return (b.perfectSessions || 0) - (a.perfectSessions || 0);
                return a.name.localeCompare(b.name);
              }).map((op) => {
                const opBelt = getBelt(op.perfectSessions || 0);
                const isCustom = !repertoire.some(defaultOp => defaultOp.id === op.id);
                const opSrs = srsMap[op.id] || { level: 0, nextReview: null };
                const opDue = opSrs.level > 0 && isDue(opSrs.nextReview);

                return (
                  <div key={op.id} className="relative group w-full max-w-full">
                    <button
                      onClick={() => resetTrainer(op, 'single')}
                      className={`w-full text-left p-4 rounded-md border-l-[3px] transition-all duration-200 cursor-pointer overflow-hidden ${
                        trainingMode === 'single' && currentOpening.id === op.id
                          ? (theme === 'dark' ? 'bg-white/10 border-white/20 shadow border-l-blue-400' : 'bg-black/5 border-black/10 shadow border-l-blue-500')
                          : `bg-transparent border-l-transparent ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
                      }`}
                    >
                      <div className="text-sm font-semibold mb-1 flex items-start justify-between min-w-0">
                        <span className="flex items-start gap-3 pr-2 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${opBelt.bg} border ${opBelt.border}`} title={opBelt.name} style={(opBelt as any).customStyle || {}}></div>
                          <span className="break-words whitespace-normal leading-tight font-bold text-base">{formatTitle(op.name)}</span>
                          {opDue && <span title="Due for review" className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-sm font-extrabold ${getDynamicBeltColor(opBelt)} leading-none flex items-baseline mt-[2px]`}>
                            {op.perfectSessions || 0}
                            {opBelt.nextThreshold && (
                              <span className="text-[10px] font-medium ml-[1px] opacity-70">/{opBelt.nextThreshold}</span>
                            )}
                          </span>
                          {(op.perfectSessions || 0) >= 1000 && <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded ml-1 font-bold inline-flex items-center"><Flame className="w-2.5 h-2.5 mr-0.5 pb-[1px]"/> MAX</span>}
                        </div>
                      </div>
                      <div className={`text-xs font-semibold whitespace-normal break-words pr-2 opacity-70 leading-tight mt-1 ml-6`}>{formatSubtitle(op.name, op.description)}</div>
                    </button>
                    {isCustom && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (user && user.uid !== 'local') {
                                import('firebase/firestore').then(({ deleteDoc, doc }) => {
                                    deleteDoc(doc(db, `users/${user.uid}/repertoire`, op.id)).catch(console.error);
                                });
                            } else {
                                setRepertoireState(prev => prev.filter(r => r.id !== op.id));
                            }
                            if (currentOpening.id === op.id) {
                                resetTrainer(repertoire[0], 'single');
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-red-900/50 text-white/50 hover:text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-20"
                          title="Delete Variation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </main>
      </div>

      {showBotMenu && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBotMenu(false)}
        >
          <div
            className="bg-black border border-white/20 rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-2 text-center">Select Belt Level to Play</h3>
            <p className="text-sm text-white/60 mb-6 text-center">Start a live game after the {currentOpening.moves.length} moves of '{currentOpening.name}'.</p>

            <div className="flex flex-col gap-3">
              {[
                { elo: 400, name: 'White Belt (400 Elo)', color: 'bg-[#E2E8F0]', text: 'text-gray-900', border: 'border-[#E2E8F0]' },
                { elo: 800, name: 'Blue Belt (800 Elo)', color: 'bg-[#7DE2FF]', text: 'text-gray-900', border: 'border-[#7DE2FF]' },
                { elo: 1200, name: 'Purple Belt (1200 Elo)', color: 'bg-[#D47DFF]', text: 'text-white', border: 'border-[#D47DFF]' },
                { elo: 1800, name: 'Brown Belt (1800 Elo)', color: 'bg-[#C88A5E]', text: 'text-white', border: 'border-[#C88A5E]' },
                { elo: 2000, name: 'Black Belt (2000 Elo)', color: 'bg-[#515151]', text: 'text-white', border: 'border-[#515151]' },
                { elo: 2100, name: '1 Stripe Black (2100 Elo)', color: 'bg-white', text: 'text-black', border: 'border-2 border-[#515151]' },
                { elo: 2200, name: '2 Stripe Black (2200 Elo)', color: 'bg-[#515151]', text: 'text-white', border: 'border-[#515151]', customStyle: { background: 'linear-gradient(90deg, #515151 25%, white 25%, white 40%, #515151 40%, #515151 60%, white 60%, white 75%, #515151 75%)' } },
                { elo: 2400, name: '3 Stripe Black (2400 Elo)', color: 'bg-[#515151]', text: 'text-white', border: 'border-[#515151]', customStyle: { background: 'linear-gradient(90deg, #515151 15%, white 15%, white 28%, #515151 28%, #515151 43%, white 43%, white 57%, #515151 57%, #515151 72%, white 72%, white 85%, #515151 85%)' } },
                { elo: 2600, name: 'Red Belt (2600 Elo)', color: 'bg-[#FF7D7D]', text: 'text-white', border: 'border-[#FF7D7D]' },
              ].map(bot => (
                <button
                  key={bot.elo}
                  onClick={() => startGame(bot.elo)}
                  style={(bot as any).customStyle || {}}
                  className={`w-full py-3 px-4 rounded-lg font-black text-sm uppercase tracking-widest transition-transform hover:scale-105 border ${bot.color} ${bot.text} ${bot.border}`}
                >
                  {bot.name}
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowBotMenu(false)}
                className="px-4 py-2 bg-white/10 text-white rounded font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-black border border-white/20 rounded-xl p-6 max-w-md w-full relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-blue-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-blue-500">
                  <UserIcon className="w-8 h-8 text-white/50" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{user?.displayName || 'Chess Player'}</h3>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                <div className="text-[10px] uppercase text-white/50 font-bold mb-1">Elo Rating</div>
                <div className="text-2xl font-bold text-blue-500">{elo}</div>
                <div className={`text-xs mt-1 ${eloColor}`}>{eloTitle}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                <div className="text-[10px] uppercase text-white/50 font-bold mb-1">Mastery</div>
                <div className="text-2xl font-bold text-blue-500">{mastery}%</div>
                <div className="text-xs text-white/60 mt-1">{repertoireState.length} Openings</div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <div className="text-[11px] uppercase text-white/50 font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Top Openings
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {[...repertoireState].sort((a, b) => (b.perfectSessions || 0) - (a.perfectSessions || 0)).slice(0, 3).map(op => (
                  <div key={op.id} className="flex justify-between items-center text-sm">
                    <span className="text-white truncate pr-4">{formatTitle(op.name)}</span>
                    <span className={`font-bold ${getDynamicBeltColor(getBelt(op.perfectSessions || 0))} flex-shrink-0`}>
                      {op.perfectSessions || 0} {getBelt(op.perfectSessions || 0).nextThreshold ? <span className="opacity-70 text-[0.85em]">/ {getBelt(op.perfectSessions || 0).nextThreshold}</span> : <span className="text-[10px] bg-yellow-500 text-black px-1 rounded ml-1"><Flame className="w-2 h-2 inline pb-[1px]" /> MAX</span>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-md hover:bg-red-900/20 text-white hover:text-red-400 border border-white/10 hover:border-red-900/50 transition-all font-bold text-sm"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Middlegame Phase 2.0 Types & Data
// ==========================================
type MiddlegameScenario = {
  id: string;
  name: string;
  description: string;
  theory?: string;
  startFen: string;
  firstMoveNumber: number;
  solutionMoves: string[];
  attempts?: number;
  perfectSessions?: number;
  coverImage?: string;
  playerColor?: 'white' | 'black';
};

const middlegameScenarios: MiddlegameScenario[] = [
  {
    id: 'strangler',
    name: 'The Strangler',
    description: 'Slow constriction',
    theory: `**Core Philosophy:** Cage complete at move 9... Build the cage, complete the route...`,
    startFen: 'r1bq1rk1/bpp1bpp1/2np1n1p/4p3/P1B1P3/2PP1N1P/1P3PP1/RNBQR1K1 w - - 1 8',
    firstMoveNumber: 8,
    solutionMoves: [
      "Nbd2", "Re8",
      "Nf1", "Bf8",
      "Ng3", "Be6",
      "Bxe6", "Rxe6",
      "d4", "exd4",
      "cxd4", "d5",
      "e5", "Nd7",
      "Bd2", "f6",
      "exf6", "Rxf6"
    ],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'queenside-crush',
    name: 'Queenside Crush',
    description: 'Minority attack',
    theory: 'Break through on the queenside.',
    startFen: 'r3kb1r/1bqn1ppp/p3Pn2/1p6/2p1P3/2N2N2/PPB2PPP/R1BQ1RK1 b kq - 0 13',
    firstMoveNumber: 13,
    solutionMoves: ['fxe6', 'Ng5', 'Nc5', 'e5', 'Qxe5', 'Re1', 'Qd6', 'Qxd6', 'Bxd6', 'Nxe6'],
    attempts: 0,
    perfectSessions: 0,
    playerColor: 'black'
  },
  {
    id: 'toxic-bait',
    name: 'Toxic Bait',
    description: 'Poisoned pawn variation',
    theory: 'Lure the opponent into capturing a poisoned pawn.',
    startFen: 'rnb1kb1r/1p1n1ppp/p3p3/4P1B1/3N4/q1N5/P1PQ2PP/1R2KB1R w Kkq - 1 12',
    firstMoveNumber: 12,
    solutionMoves: ['Ne4', 'h6', 'Bh4', 'Qxa2', 'Rd1', 'Qd5', 'Qe3', 'Qxe5', 'Be2', 'Bc5', 'Bg3'],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'high-velocity-sacks',
    name: 'High-Velocity Sacks',
    description: 'Aggressive sacrifices for initiative',
    theory: 'Create unstoppable attacking waves.',
    startFen: 'r3nrk1/2q1bppp/p1bpp2B/1p6/4PP2/1BN3Q1/PPP3PP/3R1RK1 w - - 0 15',
    firstMoveNumber: 15,
    solutionMoves: ['f5', 'Kh8', 'Bxg7+'],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'central-explosion',
    name: 'Central Explosion',
    description: 'Break open the center rapidly',
    theory: 'Exploit a lead in development by opening the center.',
    startFen: 'r2q1rk1/p3bpp1/4bn1p/2pp4/7B/3B1Q2/PPP1NPPP/4RRK1 w - - 0 15',
    firstMoveNumber: 15,
    solutionMoves: ['Nf4', 'Bg4', 'Bxf6'],
    attempts: 0,
    perfectSessions: 0
  }
];

function MiddlegamePhaseOne({ theme, setTheme }: { theme: Theme, setTheme: (t: Theme) => void }) {
  const [scenarioState, setScenarioState] = useState<MiddlegameScenario[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MIDDLEGAME_SCENARIOS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MiddlegameScenario[];
        const merged = middlegameScenarios.map(defaultScenario => {
          const savedScenario = parsed.find(p => p.id === defaultScenario.id);
          return savedScenario ? {
            ...defaultScenario,
            attempts: Math.max(defaultScenario.attempts || 0, savedScenario.attempts || 0),
            perfectSessions: Math.max(defaultScenario.perfectSessions || 0, savedScenario.perfectSessions || 0)
          } : { ...defaultScenario };
        });
        return merged;
      } catch (e) {
        return middlegameScenarios;
      }
    }
    return middlegameScenarios;
  });

  const [currentScenario, setCurrentScenario] = useState<MiddlegameScenario>(scenarioState[0]);
  const [game, setGame] = useState(new Chess());
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [puzzleState, setPuzzleState] = useState<'playing' | 'completed' | 'error'>('playing');
  const [feedback, setFeedback] = useState<{ type: 'idle' | 'success' | 'error' | 'completed', message: string }>({ type: 'idle', message: 'Ready to solve.' });
  const [currentErrors, setCurrentErrors] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'list' | 'timer'>('list');
  const [aiCoachTip, setAiCoachTip] = useState<string | null>(null);
  const [isGettingTip, setIsGettingTip] = useState(false);

  const [trainingMode, setTrainingMode] = useState<'single'>('single');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const loadScenario = useCallback((scenario: MiddlegameScenario) => {
    try {
      const newGame = new Chess(scenario.startFen);
      setGame(newGame);
      setCurrentScenario(scenario);
      setSolutionIndex(0);
      setPuzzleState("playing");
      setFeedback({ type: "idle", message: "Your turn. Find the winning plan." });
      setCurrentErrors(0);
      setAiCoachTip(null);
    } catch (e) {
      console.error("Critical: Failed to load target FEN structural template.", e);
    }
  }, []);

  const resetTrainer = useCallback((scenario?: MiddlegameScenario) => {
    const target = scenario || currentScenario;
    loadScenario(target);
  }, [currentScenario, loadScenario]);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (puzzleState === 'completed' || timeLeft === 0) return false;

    const gameCopy = new Chess(game.fen());
    let moveAttempt = null;

    try {
      moveAttempt = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase() ?? 'q'
      });
    } catch (e) {
      return false;
    }

    if (moveAttempt === null) return false;

    const expectedUserMove = currentScenario.solutionMoves[solutionIndex];

    if (moveAttempt.san === expectedUserMove) {
      const nextIndex = solutionIndex + 1;

      if (nextIndex >= currentScenario.solutionMoves.length) {
        setGame(gameCopy);
        setSolutionIndex(nextIndex);
        setPuzzleState('completed');
        setFeedback({ type: 'completed', message: 'Scenario Complete! Structural mastery achieved.' });

        let attemptsBonus = 1;
        let perfectBonus = currentErrors === 0 ? 1 : 0;
        setScenarioState(prev => {
          const updated = prev.map(s => {
             if (s.id === currentScenario.id) {
                return {
                   ...s,
                   attempts: (s.attempts || 0) + attemptsBonus,
                   perfectSessions: (s.perfectSessions || 0) + perfectBonus
                };
             }
             return s;
          });
          localStorage.setItem(STORAGE_KEYS.MIDDLEGAME_SCENARIOS, JSON.stringify(updated));
          return updated;
        });

        return true;
      }

      // opponent response
      const opponentReplyMove = currentScenario.solutionMoves[nextIndex];
      try {
        gameCopy.move(opponentReplyMove);
        setGame(gameCopy);

        const finalIndexAfterReply = nextIndex + 1;
        setSolutionIndex(finalIndexAfterReply);

        if (finalIndexAfterReply >= currentScenario.solutionMoves.length) {
          setPuzzleState('completed');
          setFeedback({ type: 'completed', message: 'Scenario Complete! Structural mastery achieved.' });

          let attemptsBonus = 1;
          let perfectBonus = currentErrors === 0 ? 1 : 0;
          setScenarioState(prev => {
            const updated = prev.map(s => {
               if (s.id === currentScenario.id) {
                  return {
                     ...s,
                     attempts: (s.attempts || 0) + attemptsBonus,
                     perfectSessions: (s.perfectSessions || 0) + perfectBonus
                  };
               }
               return s;
            });
            localStorage.setItem(STORAGE_KEYS.MIDDLEGAME_SCENARIOS, JSON.stringify(updated));
            return updated;
          });

        } else {
          setFeedback({ type: 'success', message: 'Correct move. Continue the constriction plan.' });
        }
        return true;
      } catch (err) {
        console.error("Error executing auto-response line confirmation step:", err);
        return false;
      }
    } else {
      setCurrentErrors(e => e + 1);
      setFeedback({ type: 'error', message: 'Incorrect layout continuation vector. Try again.' });
      return false;
    }
  };

  useEffect(() => {
    loadScenario(scenarioState[0]);
  }, []);

  const askHikaru = async () => {
    if (isGettingTip) return;
    setIsGettingTip(true);
    setAiCoachTip("Hikaru says: Look at the tension in the center. Notice any overloaded pieces?");
    setTimeout(() => setIsGettingTip(false), 1000);
  };

  const currentBelt = getBelt(currentScenario.perfectSessions || 0);
  const highestPerfectSessions = Math.max(0, ...scenarioState.map(op => op.perfectSessions || 0));
  const highestBelt = getBelt(highestPerfectSessions);

  const getDynamicBeltColor = (belt: {name: string, color: string}) => {
    return theme === 'dark' && belt.name.includes('Black Belt') ? 'text-white' : belt.color;
  };

  const currentFen = game.fen();

  return (
    <div className="h-full w-full flex flex-col font-sans relative transition-colors duration-500 overflow-hidden rounded-3xl">
      <div className={`absolute inset-0 pointer-events-none z-0 transition-all duration-1000 ${theme === 'dark' ? 'mix-blend-screen opacity-20' : 'mix-blend-normal opacity-[0.85]'}`} style={{
        background: theme === 'dark' ? getBeltGradient(currentBelt.name) : getLightBeltGradient(currentBelt.name)
      }} />
      {theme === 'dark' && (
        <div
          className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516483638261-f40af5ee22dd?q=80&w=2000&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      <div className="relative z-10 flex flex-col flex-grow h-full overflow-hidden p-4 lg:p-6 lg:pb-8 lg:px-8 gap-4 lg:gap-6 w-full">

        <main className="grid grid-cols-1 lg:grid-cols-[300px_1fr_160px] xl:grid-cols-[300px_1fr_220px] gap-4 lg:gap-6 flex-grow min-h-0 w-full relative z-10">

          {/* Order 3: Right Panel (Moves / Timer & Settings) */}
          <div className="hidden lg:flex flex-col gap-4 relative z-10 h-full w-full flex-shrink-0 lg:overflow-hidden lg:order-3">
            <div className={`rounded-xl border p-4 flex flex-col flex-grow min-h-0 overflow-hidden shadow-xl h-full ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
                <div className={`flex rounded-t-md overflow-hidden shrink-0 border border-b-0 ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-black/5 border-black/10'}`}>
                   <button
                      onClick={() => setLeftPanelTab('list')}
                      className={`flex-1 p-3 text-center font-bold text-sm tracking-wider transition-colors ${leftPanelTab === 'list' ? (theme === 'dark' ? 'bg-black/80 text-white border-t-2 border-t-white' : 'bg-white text-black border-t-2 border-t-black') : (theme === 'dark' ? 'text-white/50 hover:bg-black/40 opacity-70 border-t-2 border-t-transparent' : 'text-black/50 hover:bg-black/5 opacity-70 border-t-2 border-t-transparent')}`}
                   >
                     List <span className="font-mono ml-1 opacity-70">{solutionIndex}/{currentScenario.solutionMoves.length}</span>
                   </button>
                   <button
                      onClick={() => setLeftPanelTab('timer')}
                      className={`flex-1 p-3 text-center font-bold text-sm tracking-wider transition-colors ${leftPanelTab === 'timer' ? (theme === 'dark' ? 'bg-black/80 text-white border-t-2 border-t-white' : 'bg-white text-black border-t-2 border-t-black') : (theme === 'dark' ? 'text-white/50 hover:bg-black/40 opacity-70 border-t-2 border-t-transparent' : 'text-black/50 hover:bg-black/5 opacity-70 border-t-2 border-t-transparent')}`}
                   >
                     Timer
                   </button>
                </div>

                <div className={`flex flex-col border rounded-b-md shadow-lg overflow-hidden flex-grow min-h-0 ${theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white border-black/10 border-t-0'}`}>
                  {leftPanelTab === 'list' ? (
                    <div className="flex-1 overflow-y-auto p-2 lg:p-3 custom-scrollbar flex flex-col gap-1 min-h-0 pt-3 text-white">
                      {(() => {
                        const solutionArray = currentScenario.solutionMoves;
                        const startNum = currentScenario.firstMoveNumber;
                        const rowCount = Math.ceil(solutionArray.length / 2);

                        return Array.from({ length: rowCount }).map((_, i) => {
                          const displayMoveNum = startNum + i;

                          const whiteMoveText = solutionArray[i * 2];
                          const blackMoveText = solutionArray[i * 2 + 1];

                          const whiteIndex = i * 2;
                          const blackIndex = i * 2 + 1;

                          // Determine visibility and active styling contexts
                          const isWhiteVisible = solutionIndex >= whiteIndex;
                          const isBlackVisible = solutionIndex >= blackIndex;

                          const isWhiteActive = solutionIndex === whiteIndex;
                          const isBlackActive = solutionIndex === blackIndex;

                          const whiteTextClass = !isWhiteVisible ? 'text-white/10' :
                                                 isWhiteActive ? 'text-blue-400 font-extrabold font-mono drop-shadow-md' :
                                                 'text-white/40 font-medium';

                          const blackTextClass = !isBlackVisible ? 'text-white/10' :
                                                 isBlackActive ? 'text-blue-400 font-extrabold font-mono drop-shadow-md' :
                                                 'text-white/40 font-medium';

                          return (
                            <div key={i} className="flex text-base xl:text-lg py-1.5 xl:py-2 px-1 border-b border-white/10 hover:bg-white/5 transition-colors rounded items-center shrink-0">
                              <div className="w-8 text-white/50 text-right pr-2 text-xs xl:text-sm font-mono opacity-60">
                                {displayMoveNum}.
                              </div>
                              <div className={`flex-1 pl-1 text-left ${whiteTextClass}`}>
                                {whiteMoveText || ''}
                              </div>
                              <div className={`flex-1 pl-1 text-left ${blackTextClass}`}>
                                {blackMoveText || ''}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className={`flex-1 p-6 flex flex-col items-center justify-center min-h-0 relative ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      <span className="font-bold opacity-50 uppercase tracking-widest text-xs mb-2">PRACTICE RUN</span>
                      <div className="text-6xl font-black tabular-nums tracking-tighter">0:00</div>
                    </div>
                  )}
                </div>
            </div>

            <div className={`flex flex-row items-center justify-between w-full mt-auto shrink-0 py-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
               <button
                  onClick={() => resetTrainer()}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Restart Scenario"
               >
                  <RotateCcw className="w-5 h-5 flex-shrink-0" />
               </button>
               <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-3 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  title="Toggle Theme"
               >
                  {theme === 'dark' ? <Moon className="w-5 h-5 flex-shrink-0" /> : <Sun className="w-5 h-5 flex-shrink-0" />}
               </button>
            </div>
          </div>

          {/* Order 2: Center Panel (Chessboard) */}
          <div className={`rounded-xl border p-4 flex flex-col items-stretch relative overflow-hidden min-w-0 shadow-xl h-full lg:order-2 ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
            <div className={`w-full max-w-[min(100%,_70vh)] lg:max-w-[min(100%,_65vh)] aspect-square mx-auto border rounded-md shadow-xl overflow-hidden relative mb-4 flex-shrink-0 ${theme === 'dark' ? 'border-white/20' : 'border-black/20'}`}>
              <div className="w-full h-full absolute inset-0">
                <SafeChessboard
                   key={currentFen}
                   position={currentFen}
                   onPieceDrop={onDrop}
                   boardOrientation={currentScenario.playerColor === 'black' ? 'black' : 'white'}
                   customDarkSquareStyle={{ backgroundColor: currentBelt.boardHex || currentBelt.hex }}
                   customLightSquareStyle={{ backgroundColor: theme === 'dark' ? '#f4f1ea' : '#f0f0f0' }}
                   animationDuration={200}
                   areArrowsAllowed={false}
                />
              </div>
              {feedback.type === 'error' && !sessionCompleted && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-red-500/30 bg-black/90 px-6 py-2.5 text-center text-sm font-bold text-red-500 z-30 shadow-2xl backdrop-blur-md">
                    {feedback.message}
                 </div>
              )}
            </div>

            <div className={`flex flex-col gap-3 flex-shrink-0 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              <div className="flex items-start gap-4">
                 <button
                   onClick={askHikaru}
                   disabled={isGettingTip || sessionCompleted}
                   className={`p-3 rounded-md transition-all flex items-center justify-center shrink-0 border shadow-sm ${
                     isGettingTip || sessionCompleted
                       ? 'opacity-50 cursor-not-allowed border-transparent bg-black/5'
                       : (theme === 'dark' ? 'bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/20 text-blue-400' : 'bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20 text-blue-600')
                   }`}
                   title="Ask Hikaru"
                 >
                   <BrainCircuit className="w-6 h-6" />
                 </button>
                 <div className="flex-1 min-w-0 relative">
                   <div className={`rounded-xl px-5 py-4 shadow-inner border text-sm font-bold relative min-h-[64px] flex items-center ${
                     feedback.type === 'completed'
                       ? (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20')
                       : feedback.type === 'error'
                       ? (theme === 'dark' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-500/10 text-red-600 border-red-500/20')
                       : (theme === 'dark' ? 'bg-black/40 text-white/90 border-white/10' : 'bg-black/5 text-black border-black/10')
                   }`}>
                     {aiCoachTip ? (
                       <span className={theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}>{aiCoachTip}</span>
                     ) : (
                       <span>
                         {feedback.message === 'Ready to solve.' ? (
                            <span><span className="opacity-50 font-normal mr-2">HIKARU:</span> "Find the crushing continuation."</span>
                         ) : feedback.message}
                       </span>
                     )}
                   </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Order 1: Left Panel (Scenarios) */}
          <div className={`flex flex-col gap-4 relative z-10 w-full h-full min-h-0 lg:overflow-hidden lg:order-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            <div className={`rounded-xl border p-4 flex flex-col flex-grow min-h-0 overflow-hidden shadow-xl h-full ${theme === 'dark' ? 'bg-black/40 backdrop-blur border-white/10' : 'bg-white/80 border-black/10'}`}>
              <div className="flex flex-col gap-2 mb-4 shrink-0">
                 <button className={`w-full py-2 rounded-md font-black text-xs uppercase tracking-wider text-center border shadow-sm outline outline-2 outline-offset-2 outline-blue-500 bg-white text-black border-black/20`}>
                   All Scenarios
                 </button>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar flex-grow min-h-0">
                {scenarioState.map((scenario) => {
                  const scenarioBelt = getBelt(scenario.perfectSessions || 0);
                  return (
                    <div key={scenario.id} className="relative group w-full max-w-full">
                      <button
                        onClick={() => resetTrainer(scenario)}
                        className={`w-full text-left p-4 rounded-md border-l-[3px] transition-all duration-200 cursor-pointer overflow-hidden ${
                          currentScenario.id === scenario.id
                            ? (theme === 'dark' ? 'bg-white/10 border-white/20 shadow border-l-blue-400' : 'bg-black/5 border-black/10 shadow border-l-blue-500')
                            : `bg-transparent border-l-transparent ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`
                        }`}
                      >
                        <div className="text-sm font-semibold mb-1 flex items-start justify-between min-w-0">
                          <span className="flex items-start gap-3 pr-2 min-w-0 flex-1">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${scenarioBelt.bg} border ${scenarioBelt.border}`} title={scenarioBelt.name} style={(scenarioBelt as any).customStyle || {}}></div>
                            <span className="break-words whitespace-normal leading-tight font-bold text-base">{scenario.name}</span>
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${getDynamicBeltColor(scenarioBelt)} leading-none flex items-baseline mt-[2px]`}>
                              {scenario.perfectSessions || 0}
                            </span>
                          </div>
                        </div>
                        <div className={`text-xs font-semibold whitespace-normal break-words pr-2 opacity-70 leading-tight mt-1 ml-6`}>{scenario.description}</div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

// ==========================================
// CHESSai Main App Router
// ==========================================
export default function App() {
  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  // Set by Engine Lab's "Autopsy This Game" button; Autopsy consumes (and
  // clears) it to auto-load + auto-run that game's diagnosis. Lifted up
  // here (rather than local to either panel) because only one of the two
  // sibling panels is mounted at a time — matching ChessGameStore.swift's
  // pendingAutopsyGame cross-tab handoff on iOS.
  const [pendingAutopsyGame, setPendingAutopsyGame] = useState<ChessComGame | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SECTION, activeSection);
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const activeConfig = SECTIONS.find((section) => section.id === activeSection)!;

  return (
    <div
      className={`min-h-screen overflow-hidden font-sans ${
        theme === "dark"
          ? "bg-black text-white"
          : "bg-[#f4f1ea] text-zinc-950"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute left-1/2 top-[-20%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen flex-col p-4 lg:p-6">
        <header className="mb-4 grid shrink-0 grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur lg:grid-cols-[240px_1fr_auto] lg:items-center">
          <div>
            <div className="text-4xl font-black uppercase leading-none tracking-[-0.08em]">
              CHESS
            </div>
            <div className="text-4xl font-light italic leading-none tracking-[-0.08em] text-white/70">
              ai
            </div>
          </div>

          <div className="lg:text-center">
            <div className="text-2xl font-black uppercase tracking-tight">
              {activeConfig.label}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
              {activeConfig.subtitle}
            </div>
          </div>

          <div className="w-24"></div>
        </header>

        <nav className="mb-4 grid shrink-0 grid-cols-5 gap-2 rounded-3xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl backdrop-blur">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`rounded-2xl px-2 py-3 text-xs font-black uppercase tracking-wider transition ${
                activeSection === section.id
                  ? "bg-white text-black shadow-lg"
                  : "bg-black/20 text-white/55 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="hidden sm:inline">{section.label}</span>
              <span className="sm:hidden">{section.shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur">
          {activeSection === "opening" && <OpeningPhaseOne theme={theme} setTheme={setTheme} />}

          {activeSection === "middlegame" && (
            <MiddlegamePhaseOne theme={theme} setTheme={setTheme} />
          )}

          {activeSection === "endgame" && <EndgameDojo theme={theme} />}

          {activeSection === "autopsy" && (
            <Autopsy
              theme={theme}
              pendingGame={pendingAutopsyGame}
              onConsumedPendingGame={() => setPendingAutopsyGame(null)}
            />
          )}

          {activeSection === "engineLab" && (
            <EngineLab
              theme={theme}
              onAutopsyRequested={(game) => {
                setPendingAutopsyGame(game);
                setActiveSection('autopsy');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
