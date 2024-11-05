// pages/index.tsx
import React, { useState } from 'react';
import Header from '@/components/Header';
import AppTabs from '@/components/Tabs';
import TodayTab from '@/components/TodayTab';
import ProgressTab from '@/components/ProgressTab';
import WeeklyPlanTab from '@/components/WeeklyPlanTab';
import { TabsContent } from '@radix-ui/react-tabs'; // Import TabsContent explicitly from Radix UI

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("today");

  return (
    <div className="max-w-6xl mx-auto bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <Header />
      <AppTabs defaultValue={activeTab} onChange={setActiveTab}>
        <TabsContent value="today">
          <TodayTab />
        </TabsContent>
        <TabsContent value="progress">
          <ProgressTab />
        </TabsContent>
        <TabsContent value="plan">
          <WeeklyPlanTab />
        </TabsContent>
      </AppTabs>
    </div>
  );
};

export default Home;
