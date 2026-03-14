import React from 'react';

export const RecessoBanner: React.FC = () => {
  const recessoDate = new Date('2026-03-25T00:00:00');
  const now = new Date();

  if (now >= recessoDate) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white py-3 px-4 text-center font-black uppercase tracking-widest text-xs shadow-md z-40 relative">
      ⚠️ Nilo Lanches está em recesso até dia 25/03/2026.
    </div>
  );
};
