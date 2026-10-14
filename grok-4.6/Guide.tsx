import React, { useState, useEffect, useCallback, useRef } from 'react';
import Pet from './Pet';

interface GuideStep {
  id: string;
  message: string;
  targetSelector: string;
  preferredPlacement: 'left' | 'right' | 'above' | 'below';
  action?: 'look' | 'point' | 'walk';
  completionEvent?: string;
}

interface GuideProps {
  children?: React.ReactNode;
}

const Guide: React.FC<GuideProps> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps] = useState<GuideStep[]>([
    {
      id: 'welcome',
      message: 'Welcome to the pet world! Click the pet to see it move.',
      targetSelector: '.pet-container',
      preferredPlacement: 'right',
      action: 'look',
    },
    {
      id: 'petting',
      message: 'Pet the pet with your mouse! It loves affection.',
      targetSelector: '.pet-container',
      preferredPlacement: 'left',
      action: 'point',
    },
    {
      id: 'level',
      message: 'Level up by clicking! The pet grows stronger.',
      targetSelector: '.pet-label',
      preferredPlacement: 'above',
    },
    {
      id: 'pause',
      message: 'Try the pause button to see the pet rest.',
      targetSelector: 'button[title="Toggle pause"]',
      preferredPlacement: 'below',
    },
  ]);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [petPosition, setPetPosition] = useState({ x: 0, y: 0 });

  const petRef = useRef<HTMLDivElement>(null);

  const highlightTarget = useCallback((step: GuideStep) => {
    const element = document.querySelector(step.targetSelector) as HTMLElement;
    if (!element) return;

    setTargetElement(element);
    element.style.border = '3px solid #f59e0b';
    element.style.borderRadius = '8px';
    element.style.position = 'relative';
    element.style.zIndex = '100';

    const rect = element.getBoundingClientRect();
    setPetPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, []);

  const placePet = useCallback((placement: GuideStep['preferredPlacement'], element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const containerRect = petRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let offsetX = 0;
    let offsetY = 0;

    switch (placement) {
      case 'left':
        offsetX = -rect.width - 20;
        offsetY = rect.height / 2 - containerRect.height / 2;
        break;
      case 'right':
        offsetX = rect.width + 20;
        offsetY = rect.height / 2 - containerRect.height / 2;
        break;
      case 'above':
        offsetX = rect.width / 2 - containerRect.width / 2;
        offsetY = -rect.height - 20;
        break;
      case 'below':
        offsetX = rect.width / 2 - containerRect.width / 2;
        offsetY = rect.height + 20;
        break;
    }

    // Adjust for viewport bounds
    if (offsetX + containerRect.width > viewportWidth) offsetX = viewportWidth - containerRect.width - 20;
    if (offsetY + containerRect.height > viewportHeight) offsetY = viewportHeight - containerRect.height - 20;
    if (offsetX < 0) offsetX = 20;
    if (offsetY < 0) offsetY = 20;

    setPetPosition({
      x: rect.left + offsetX,
      y: rect.top + offsetY,
    });
  }, []);

  const showSpeech = useCallback((step: GuideStep) => {
    setCurrentMessage(step.message);

    // Trigger pet animation
    if (petRef.current) {
      petRef.current.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      petRef.current.style.transform = 'scale(1.08)';
      setTimeout(() => {
        petRef.current!.style.transform = 'scale(1)';
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (currentStep >= steps.length) {
      setIsActive(false);
      return;
    }

    const step = steps[currentStep];
    highlightTarget(step);
    placePet(step.preferredPlacement, targetElement!);
    showSpeech(step);

    // Auto advance after delay
    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 3500);

    return () => clearTimeout(timer);
  }, [currentStep, steps, highlightTarget, placePet, showSpeech, targetElement]);

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  return (
    <>
      {children}

      {isActive && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          background: 'white',
          border: '3px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 20px',
          maxWidth: '280px',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          zIndex: 9999,
          pointerEvents: 'auto',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🐾</div>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {steps[currentStep]?.id === 'welcome' ? '🐾' : steps[currentStep]?.id === 'petting' ? '🐾' : '🐾'}
          </div>
          <div style={{ fontSize: '15px', lineHeight: '1.5' }}>
            {currentMessage}
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            opacity: 0.7,
          }}>
            <button
              onClick={nextStep}
              style={{
                flex: 1,
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Next
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              style={{
                flex: 1,
                background: '#e2e8f0',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      <div ref={petRef} style={{
        position: 'fixed',
        left: petPosition.x,
        top: petPosition.y,
        zIndex: 9998,
        transition: 'left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Pet />
      </div>
    </>
  );
};

export default Guide;
