import React from 'react';

interface ProofDeskLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 'h-5 w-5', text: 'text-base' },
  md: { icon: 'h-6 w-6', text: 'text-lg' },
  lg: { icon: 'h-8 w-8', text: 'text-2xl' },
  xl: { icon: 'h-16 w-16', text: 'text-4xl' },
};

const ProofDeskLogo: React.FC<ProofDeskLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/favicon.svg"
        alt="ProofDesk AI Logo"
        className={s.icon}
        width={size === 'xl' ? 64 : size === 'lg' ? 32 : size === 'md' ? 24 : 20}
        height={size === 'xl' ? 64 : size === 'lg' ? 32 : size === 'md' ? 24 : 20}
      />
      {showText && (
        <span className={`${s.text} font-semibold tracking-tight`}>
          ProofDesk
        </span>
      )}
    </div>
  );
};

export default ProofDeskLogo;
