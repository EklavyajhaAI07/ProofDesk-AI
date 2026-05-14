import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'loading' | 'fadeIn' | 'hold' | 'fadeOut'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => setPhase('fadeIn'), 100);
      setTimeout(() => setPhase('hold'), 600);
      setTimeout(() => setPhase('fadeOut'), 2000);
      setTimeout(() => onComplete(), 2600);
    }
  }, [progress, onComplete]);

  const getContainerStyle = (): React.CSSProperties => {
    switch (phase) {
      case 'fadeIn':
        return { opacity: 1 };
      case 'fadeOut':
        return { opacity: 0, transform: 'scale(1.05)' };
      default:
        return { opacity: 0.8 };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-all duration-1000 ease-out"
      style={getContainerStyle()}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative bg-card/80 backdrop-blur-sm p-6 rounded-3xl border border-border/50 shadow-2xl">
            <img src="/logo.svg" alt="ProofDesk AI" className="h-16 w-16 animate-pulse" width={64} height={64} />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          ProofDesk
        </h1>
        
        <p className="text-muted-foreground text-sm md:text-base mb-8 tracking-wide uppercase letter-spacing-wide">
          AI-Powered Document Processing
        </p>

        <div className="w-64 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground/60 font-medium tracking-widest uppercase">
          {progress < 30 ? 'Initializing...' : 
           progress < 60 ? 'Loading resources...' : 
           progress < 90 ? 'Preparing interface...' : 
           'Almost ready...'}
        </p>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-bounce"
              style={{ 
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;