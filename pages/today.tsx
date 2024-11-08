// pages/today.tsx
import { GetServerSideProps } from 'next';
import { useState } from 'react';

interface Activity {
  date: string | null;
  timestamp: string | null;
  exercise_type: string | null;
  duration: number | null;
  distance: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  z2_percent: number | null;
  above_z2_percent: number | null;
  below_z2_percent: number | null;
  pace: string | null;
  route: string | null;
  notes: string | null;
}

interface TrainingPlanEntry {
  date: string | null;
  exercise_type: string | null;
  duration_planned_min: number | null;
  duration_planned_max: number | null;
  notes: string | null;
}

interface TodayProps {
  plannedActivities: TrainingPlanEntry[];
  recentActivities: Activity[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const [trainingPlanRes, activityLogRes] = await Promise.all([
    fetch('http://localhost:3000/api/trainingPlan'),
    fetch('http://localhost:3000/api/activityLog'),
  ]);

  const trainingPlanData = await trainingPlanRes.json();
  const activityLogData = await activityLogRes.json();

  // Filter for today’s planned activities
  const today = new Date().toISOString().split('T')[0];
  const plannedActivities = trainingPlanData.filter((activity: TrainingPlanEntry) => activity.date === today);

  // Get the last 2 completed activities
  const recentActivities = activityLogData.slice(0, 2);

  return { props: { plannedActivities, recentActivities } };
};

const Today = ({ plannedActivities, recentActivities }: TodayProps) => {
  const [showJson, setShowJson] = useState(false);

  return (
    <div>
      <h1>Today's Training</h1>
      <button onClick={() => setShowJson(!showJson)}>
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>

      {showJson ? (
        <pre>{JSON.stringify({ plannedActivities, recentActivities }, null, 2)}</pre>
      ) : (
        <div>
          <section>
            <h2>Today's Planned Activities</h2>
            <table>
              <thead>
                <tr>
                  <th>Exercise Type</th>
                  <th>Duration (min)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {plannedActivities.map((activity, index) => (
                  <tr key={index}>
                    <td>{activity.exercise_type || '-'}</td>
                    <td>
                      {activity.duration_planned_min} - {activity.duration_planned_max} min
                    </td>
                    <td>{activity.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Recent Activities</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise Type</th>
                  <th>Duration (min)</th>
                  <th>Distance (km)</th>
                  <th>Pace</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((activity, index) => (
                  <tr key={index}>
                    <td>{activity.date || '-'}</td>
                    <td>{activity.exercise_type || '-'}</td>
                    <td>{activity.duration !== null ? activity.duration : '-'}</td>
                    <td>{activity.distance !== null ? activity.distance : '-'}</td>
                    <td>{activity.pace || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
};

export default Today;