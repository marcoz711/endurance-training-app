// components/Layout.tsx
import React from 'react';
import Header from './Header';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <Tabs>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="progressMetrics">Progress</TabsTrigger>
            <TabsTrigger value="weeklyPlan">Plan</TabsTrigger>
          </TabsList>
        </Tabs>
        {children}
      </main>
    </div>
  );
};

export default Layout;