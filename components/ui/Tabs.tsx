// components/ui/Tabs.tsx
import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';

interface TabsProps {
  children: ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children }) => {
  return <div>{children}</div>;
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => (
  <div className={`flex border-b ${className}`}>{children}</div>
);

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = '' }) => {
  const router = useRouter();
  const isActive = router.pathname === `/${value}`;

  const handleClick = () => {
    router.push(`/${value}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 ${
        isActive ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'text-gray-600'
      } ${className}`}
    >
      {children}
    </button>
  );
};