import React, { createContext, useContext, useState, useEffect } from 'react';

export type UiDensity = 'comfortable' | 'compact';

interface DensityContextType {
  density: UiDensity;
  setDensity: (density: UiDensity) => void;
  isComfortable: boolean;
}

const DensityContext = createContext<DensityContextType>({
  density: 'comfortable',
  setDensity: () => {},
  isComfortable: true,
});

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<UiDensity>(() => {
    const saved = localStorage.getItem('quotation_ai_density');
    return (saved as UiDensity) || 'comfortable';
  });

  const setDensity = (newDensity: UiDensity) => {
    setDensityState(newDensity);
    localStorage.setItem('quotation_ai_density', newDensity);
  };

  const isComfortable = density === 'comfortable';

  return (
    <DensityContext.Provider value={{ density, setDensity, isComfortable }}>
      <div className={density === 'comfortable' ? 'density-comfortable' : 'density-compact'}>
        {children}
      </div>
    </DensityContext.Provider>
  );
};

export const useDensity = () => useContext(DensityContext);
