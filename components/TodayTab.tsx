// components/TodayTab.tsx
import React from 'react';
import { Footprints, Activity, Dumbbell, CheckCircle } from 'lucide-react'; // Adjusted import

const TodayTab: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-md p-4 text-gray-800">
      <h2 className="text-lg font-semibold mb-4">Today’s Activities</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Footprints className="h-6 w-6 text-blue-500 mr-4" /> {/* Icon for Zone 2 Run */}
            <div>
              <h3 className="text-md font-semibold">Zone 2 Run (45 min)</h3>
              <p className="text-sm text-gray-600">Easy pace, focus on breathing</p>
            </div>
          </div>
          <span className="text-green-500 flex items-center">
            <CheckCircle className="h-5 w-5 mr-1" /> Log Activity
          </span>
        </div>

        <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Dumbbell className="h-6 w-6 text-purple-500 mr-4" /> {/* Icon for Strength */}
            <div>
              <h3 className="text-md font-semibold">Strength (30 min)</h3>
              <p className="text-sm text-gray-600">Lower body focus</p>
            </div>
          </div>
          <span className="text-green-500 flex items-center">
            <CheckCircle className="h-5 w-5 mr-1" /> Log Activity
          </span>
        </div>

        <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-green-500 mr-4" /> {/* Icon for Mobility */}
            <div>
              <h3 className="text-md font-semibold">Mobility (20 min)</h3>
              <p className="text-sm text-gray-600">P90X Dynamics</p>
            </div>
          </div>
          <span className="text-green-500 flex items-center">
            <CheckCircle className="h-5 w-5 mr-1" /> Log Activity
          </span>
        </div>
      </div>

      <button className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 focus:outline-none">
        Log Other Activity
      </button>

      <div className="mt-8">
        <h3 className="text-md font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-sm">
            <span>Run</span>
            <span className="text-sm text-gray-600">2024-03-28</span>
            <span className="text-sm text-gray-600">45 min • Z2: 82% • 7:30/km</span>
          </div>
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-sm">
            <span>Strength</span>
            <span className="text-sm text-gray-600">2024-03-27</span>
            <span className="text-sm text-gray-600">30 min</span>
          </div>
          <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg shadow-sm">
            <span>Run</span>
            <span className="text-sm text-gray-600">2024-03-25</span>
            <span className="text-sm text-gray-600">60 min • Z2: 78% • 7:45/km</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayTab;