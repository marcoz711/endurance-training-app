// components/ProgressTab.tsx
import React from 'react';

const ProgressTab: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <h2 className="text-lg font-semibold mb-4">Progress Overview</h2>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <h3 className="text-md font-semibold mb-2">Zone 2 Time Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Weekly average of time spent in Zone 2.</p>
          {/* Placeholder for chart */}
          <div className="h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
            Chart Placeholder
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <h3 className="text-md font-semibold mb-2">Plan Adherence Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Percentage of planned vs. completed activities.</p>
          {/* Placeholder for chart */}
          <div className="h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
            Chart Placeholder
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <h3 className="text-md font-semibold mb-2">Average Pace Trend</h3>
          <p className="text-sm text-gray-600 mb-4">Weekly average pace over time.</p>
          {/* Placeholder for chart */}
          <div className="h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
            Chart Placeholder
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTab;