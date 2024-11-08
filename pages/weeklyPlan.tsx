// pages/weeklyPlan.tsx
import { GetServerSideProps } from 'next';
import { useState } from 'react';

interface TrainingPlanEntry {
  date: string | null;
  exercise_type: string | null;
  duration_planned_min: number | null;
  duration_planned_max: number | null;
  notes: string | null;
}

interface WeeklyPlanProps {
  weeklyActivities: TrainingPlanEntry[];
}

// Helper function to get the start and end of the current week
const getCurrentWeekDates = () => {
  const currentDate = new Date();
  const firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
  const lastDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));
  return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
};

export const getServerSideProps: GetServerSideProps = async () => {
  const res = await fetch('http://localhost:3000/api/trainingPlan');
  const trainingPlanData = await res.json();

  const { start, end } = getCurrentWeekDates();
  const weeklyActivities = trainingPlanData.filter((activity: TrainingPlanEntry) =>
    activity.date >= start && activity.date <= end
  );

  return { props: { weeklyActivities } };
};

const WeeklyPlan = ({ weeklyActivities }: WeeklyPlanProps) => {
  const [showJson, setShowJson] = useState(false);

  return (
    <div>
      <h1>Weekly Plan</h1>
      <button onClick={() => setShowJson(!showJson)}>
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>

      {showJson ? (
        <pre>{JSON.stringify(weeklyActivities, null, 2)}</pre>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Exercise Type</th>
              <th>Duration (min)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {weeklyActivities.map((activity, index) => (
              <tr key={index}>
                <td>{activity.date || '-'}</td>
                <td>{activity.exercise_type || '-'}</td>
                <td>
                  {activity.duration_planned_min} - {activity.duration_planned_max} min
                </td>
                <td>{activity.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WeeklyPlan;