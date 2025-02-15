// components/Header.tsx
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 bg-white border-b p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold">Training Tracker</h1>
    </header>
  );
};

export default Header;