import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PetAnimationController {
  breathing: boolean;
  blinking: boolean;
  pupilTracking: boolean;
  headTracking: boolean;
  earTwitch: boolean;
  tailWag: boolean;
  speaking: boolean;
  heart: boolean;
}

interface PetState {
  mood: 'neutral' | 'happy' | 'excited' | 'curious' | 'tired' | 'hungry' | 'lonely';
  lifeStage: 'baby' | 'young' | 'adult';
  needs: {
    energy: number;
    hunger: number;
    affection: number;
    curiosity: number;
    trust: number;
  };
  xp: number;
  activity: 'idle' | 'walking' | 'guiding' | 'reacting' | 'playing' | 'sleeping';
  isSpeaking: boolean;
  isPaused: boolean;
  isHidden: boolean;
}

interface PetProps {
  onClick?: (e: React.MouseEvent) => void;
  onPet?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

const Pet: React.FC<PetProps> = ({ onClick, onPet, className = '' }) => {
  const [state, setState] = useState<PetState>({
    mood: 'neutral',
    lifeStage: 'adult',
    needs: {
      energy: 75,
      hunger: 30,
      affection: 65,
      curiosity: 50,
      trust: 80,
    },
    xp: 1240,
    activity: 'idle',
    isSpeaking: false,
    isPaused: false,
    isHidden: false,
  });

  const [animation, setAnimation] = useState<PetAnimationController>({
    breathing: true,
    blinking: true,
    pupilTracking: true,
    headTracking: true,
    earTwitch: true,
    tailWag: true,
    speaking: false,
    heart: false,
  });

  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [pettingProgress, setPettingProgress] = useState(0);
  const [isPetting, setIsPetting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const eyeContainerRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGGElement>(null);
  const earLeftRef = useRef<SVGGElement>(null);
  const earRightRef = useRef<SVGGElement>(null);
  const pupilLeftRef = useRef<SVGGElement>(null);
  const pupilRightRef = useRef<SVGGElement>(null);

  // Mood and need management
  const updateMood = useCallback(() => {
    const { energy, hunger, affection, curiosity, trust } = state.needs;
    let newMood: PetState['mood'] = 'neutral';
    let maxScore = -Infinity;
    const scores = [
      { mood: 'happy' as const, score: affection * 0.6 + energy * 0.4 },
      { mood: 'excited' as const, score: curiosity * 0.7 + energy * 0.3 },
      { mood: 'curious' as const, score: curiosity * 0.8 },
      { mood: 'tired' as const, score: energy * 0.3 + hunger * 0.7 },
      { mood: 'hungry' as const, score: hunger * 0.9 },
      { mood: 'lonely' as const, score: affection * 0.4 + trust * 0.6 },
    ];

    scores.forEach(({ mood, score }) => {
      if (score > maxScore) {
        maxScore = score;
        newMood = mood;
      }
    });

    // Hysteresis
    const currentMood = state.mood;
    if (Math.abs(scores.findIndex(s => s.mood === currentMood) - scores.findIndex(s => s.mood === newMood)) > 1) {
      // Change mood with some delay
      setTimeout(() => {
        setState(prev => ({ ...prev, mood: newMood }));
      }, 800);
    } else {
      setState(prev => ({ ...prev, mood: newMood }));
    }
  }, [state.needs]);

  // Update needs over time
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const newNeeds = { ...prev.needs };
        newNeeds.energy = Math.min(100, prev.needs.energy + 0.3);
        newNeeds.hunger = Math.min(100, prev.needs.hunger + 0.7);
        newNeeds.affection = Math.min(100, prev.needs.affection + 0.4);
        newNeeds.curiosity = Math.min(100, prev.needs.curiosity + 0.5);
        newNeeds.trust = Math.min(100, prev.needs.trust + 0.3);

        if (prev.activity === 'walking' || prev.activity === 'guiding') {
          newNeeds.energy = Math.max(0, prev.needs.energy - 0.8);
        }

        if (prev.activity === 'playing') {
          newNeeds.affection = Math.min(100, prev.needs.affection + 1.5);
        }

        updateMood();
        return { ...prev, needs: newNeeds };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [updateMood]);

  // Animation loop for breathing and idle
  useEffect(() => {
    if (state.isPaused || state.isHidden) return;

    let frame: number;
    let time = 0;

    const animate = () => {
      time += 1;

      // Breathing
      if (animation.breathing) {
        const breath = 0.98 + Math.sin(time * 0.15) * 0.015;
        if (svgRef.current) {
          svgRef.current.style.transform = `scale(${breath})`;
        }
      }

      // Irregular blinking
      if (animation.blinking && Math.random() < 0.008) {
        setAnimation(prev => ({ ...prev, blinking: false }));
        setTimeout(() => {
          setAnimation(prev => ({ ...prev, blinking: true }));
        }, 80 + Math.random() * 120);
      }

      // Eye saccades
      if (animation.pupilTracking) {
        // Small random movement
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 8;
        if (pupilLeftRef.current) pupilLeftRef.current.setAttribute('transform', `translate(${offsetX} ${offsetY})`);
        if (pupilRightRef.current) pupilRightRef.current.setAttribute('transform', `translate(${offsetX} ${offsetY})`);
      }

      // Ear twitch
      if (animation.earTwitch && Math.random() < 0.03) {
        const rotation = Math.random() * 8 - 4;
        if (earLeftRef.current) earLeftRef.current.setAttribute('transform', `rotate(${rotation})`);
        if (earRightRef.current) earRightRef.current.setAttribute('transform', `rotate(${rotation})`);
      }

      // Tail wag
      if (animation.tailWag && tailRef.current) {
        const wag = Math.sin(time * 0.1) * 12;
        tailRef.current.setAttribute('transform', `rotate(${wag})`);
      }

      // Speaking mouth movement
      if (animation.speaking && state.isSpeaking) {
        const mouthOpen = Math.sin(time * 0.2) * 3;
        const mouth = document.querySelector('.pet-mouth');
        if (mouth) {
          // Animate path or use stroke-dasharray trick
        }
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [state.isPaused, state.isHidden, state.isSpeaking, animation]);

  // Handle pointer interactions
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (state.isPaused || state.isHidden) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    setPosition({ x, y });
    setIsPetting(true);
    setPettingProgress(0);

    if (onPet) {
      onPet(e);
    }
  }, [state.isPaused, state.isHidden, onPet]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPetting || state.isPaused || state.isHidden) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = e.clientX - rect.left - rect.width / 2 - position.x;
    const dy = e.clientY - rect.top - rect.height / 2 - position.y;

    const dist = Math.hypot(dx, dy);
    const progress = Math.min(1, dist / 60);

    setPettingProgress(progress);

    // Increase affection when petting
    setState(prev => ({
      ...prev,
      needs: {
        ...prev.needs,
        affection: Math.min(100, prev.needs.affection + progress * 0.8),
      },
      mood: prev.needs.affection > 70 ? 'happy' : prev.mood,
    }));

    if (onPet) {
      onPet(e);
    }
  }, [position, isPetting, state.isPaused, state.isHidden, onPet]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPetting(false);
    setPettingProgress(0);

    // Small click reaction
    if (Math.hypot(e.clientX - (position.x + (containerRef.current?.getBoundingClientRect().left || 0)),
                   e.clientY - (position.y + (containerRef.current?.getBoundingClientRect().top || 0))) < 20) {
      if (onClick) onClick(e);
    }
  }, [position, onClick]);

  // Guide interaction
  const moveToTarget = useCallback((targetElement: HTMLElement) => {
    setState(prev => ({ ...prev, activity: 'guiding' }));

    const rect = targetElement.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate position beside target
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;

    const offsetX = targetCenterX + 120 - window.innerWidth / 2;
    const offsetY = targetCenterY - window.innerHeight / 2;

    setPosition({ x: offsetX, y: offsetY });

    // Play walking animation
    setAnimation(prev => ({ ...prev, tailWag: true }));

    setTimeout(() => {
      setState(prev => ({ ...prev, activity: 'idle' }));
    }, 1500);
  }, []);

  // Life stage changes
  useEffect(() => {
    if (state.xp > 800 && state.lifeStage === 'young') {
      setState(prev => ({ ...prev, lifeStage: 'adult' }));
    } else if (state.xp < 300 && state.lifeStage === 'adult') {
      setState(prev => ({ ...prev, lifeStage: 'young' }));
    }
  }, [state.xp]);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    // Click reaction
    setAnimation(prev => ({ ...prev, speaking: true }));
    setTimeout(() => setAnimation(prev => ({ ...prev, speaking: false })), 600);
  };

  // Render SVG based on life stage
  const renderPet = () => {
    const scale = state.lifeStage === 'baby' ? 0.85 : state.lifeStage === 'adult' ? 1 : 1.15;
    const earRotation = state.mood === 'tired' ? 15 : state.mood === 'happy' ? -12 : 0;

    return (
      <svg
        ref={svgRef}
        width="280"
        height="280"
        viewBox="0 0 280 280"
        className="pet-svg"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Shadow */}
        <ellipse cx="140" cy="195" rx="75" ry="25" fill="#e2e8f0" opacity="0.3" />

        {/* Body */}
        <g className="pet-body">
          <path d="M80 140 Q40 100 60 60 Q80 40 120 35 Q160 30 200 50 Q240 80 250 130 Q240 180 200 200 Q140 220 80 180 Z" />
        </g>

        {/* Head */}
        <g className="pet-head">
          <circle cx="140" cy="85" r="55" />
        </g>

        {/* Ears */}
        <g ref={earLeftRef} transform={`rotate(${earRotation} 100 45)`}>
          <path d="M85 35 Q65 5 55 40 Q65 60 85 45 Z" className="pet-ear" />
        </g>
        <g ref={earRightRef} transform={`rotate(${earRotation} 180 45)`}>
          <path d="M195 35 Q215 5 225 40 Q215 60 195 45 Z" className="pet-ear" />
        </g>

        {/* Eyes */}
        <g ref={eyeContainerRef}>
          <circle cx="115" cy="75" r="18" className="pet-eye" />
          <circle cx="165" cy="75" r="18" className="pet-eye" />
          <g ref={pupilLeftRef}>
            <circle cx="115" cy="75" r="10" className="pet-pupil" />
          </g>
          <g ref={pupilRightRef}>
            <circle cx="165" cy="75" r="10" className="pet-pupil" />
          </g>
        </g>

        {/* Eyebrows */}
        <path d="M95 55 Q115 48 135 55" stroke="#1a202c" strokeWidth="3" strokeLinecap="round" />
        <path d="M145 55 Q165 48 185 55" stroke="#1a202c" strokeWidth="3" strokeLinecap="round" />

        {/* Muzzle */}
        <g>
          <circle cx="140" cy="105" r="22" className="pet-muzzle" />
          <path d="M128 105 Q140 115 152 105" stroke="#c36240" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Nose */}
        <circle cx="140" cy="105" r="6" className="pet-nose" />

        {/* Mouth */}
        <path
          d="M128 115 Q140 122 152 115"
          className="pet-mouth"
          stroke={state.mood === 'happy' ? '#f56565' : '#1a202c'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Tail */}
        <g ref={tailRef}>
          <path d="M240 140 Q280 100 255 130" className="pet-tail" />
        </g>

        {/* Legs */}
        <g>
          <rect x="95" y="170" width="18" height="55" rx="8" className="pet-paw" />
          <rect x="165" y="170" width="18" height="55" rx="8" className="pet-paw" />
        </g>

        {/* Heart for affection */}
        {state.needs.affection > 85 && (
          <g className="pet-heart visible">
            <path d="M130 145 Q140 160 150 145" fill="#f56565" />
          </g>
        )}

        {/* Label */}
        <text
          x="140"
          y="260"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="white"
          stroke="#1a202c"
          strokeWidth="2"
        >
          {state.lifeStage === 'baby' ? '🐾' : state.lifeStage === 'young' ? '🐾' : '🐾'}
        </text>
      </svg>
    );
  };

  return (
    <div className={`pet-container ${className}`} ref={containerRef}>
      <div
        className="pet-svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: 'grab' }}
      >
        {renderPet()}
      </div>

      {/* Controls */}
      <div className="pet-controls">
        <button onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))} title="Toggle pause">
          {state.isPaused ? '▶' : '❚❚'}
        </button>
        <button onClick={() => setState(prev => ({ ...prev, isHidden: !prev.isHidden }))} title="Hide pet">
          {state.isHidden ? '👁' : '🙈'}
        </button>
        <button onClick={() => {
          setState(prev => ({ ...prev, xp: prev.xp + 100 }));
        }} title="Feed">
          🥕
        </button>
      </div>

      {/* Speech bubble */}
      {state.isSpeaking && (
        <div className="pet-speech">
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {state.mood === 'happy' ? '🐾' : state.mood === 'excited' ? '🐾' : '🐾'}
          </div>
          <div>
            {state.mood === 'happy' ? 'Purrfect day!' : state.mood === 'excited' ? 'Wanna play?' : 'Hello!'}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '8px' }}>
            {Math.round(state.needs.affection)}% affection
          </div>
        </div>
      )}

      {/* Label */}
      <div className="pet-label">
        Level {state.xp / 100}
      </div>
    </div>
  );
};

export default Pet;
