// pages/progressMetrics.tsx
import { GetServerSideProps } from 'next';
import { useState } from 'react';

interface ProgressMetric {
  date: string | null;
  metric_type: string | null;
  value: string | number | null;
}

interface ProgressMetricsProps {
  progressData: ProgressMetric[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const res = await fetch('http://localhost:3000/api/progressMetrics');
  const progressData = await res.json();

  return { props: { progressData } };
};

const ProgressMetrics = ({ progressData }: ProgressMetricsProps) => {
  const [showJson, setShowJson] = useState(false);

  return (
    <div>
      <h1>Progress Metrics</h1>
      <button onClick={() => setShowJson(!showJson)}>
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>

      {showJson ? (
        <pre>{JSON.stringify(progressData, null, 2)}</pre>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Metric Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {progressData.map((metric, index) => (
              <tr key={index}>
                <td>{metric.date || '-'}</td>
                <td>{metric.metric_type || '-'}</td>
                <td>{metric.value !== null ? metric.value : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProgressMetrics;