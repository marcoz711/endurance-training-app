// components/Tabs.tsx
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';

interface AppTabsProps {
  defaultValue: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

const AppTabs: React.FC<AppTabsProps> = ({ defaultValue, onChange, children }) => {
  return (
    <Tabs.Root defaultValue={defaultValue} onValueChange={onChange} className="p-4">
      <Tabs.List className="flex space-x-4 mb-4">
        <Tabs.Trigger
          value="today"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:bg-blue-100 focus:text-blue-700 focus:outline-none"
        >
          Today
        </Tabs.Trigger>
        <Tabs.Trigger
          value="progress"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:bg-blue-100 focus:text-blue-700 focus:outline-none"
        >
          Progress
        </Tabs.Trigger>
        <Tabs.Trigger
          value="plan"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:bg-blue-100 focus:text-blue-700 focus:outline-none"
        >
          Weekly Plan
        </Tabs.Trigger>
      </Tabs.List>
      {children}
    </Tabs.Root>
  );
};

export default AppTabs;