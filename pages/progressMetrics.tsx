// pages/progressMetrics.tsx
import Layout from '../components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import { GetServerSideProps } from 'next';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import dayjs from 'dayjs';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa'; // Import arrow icons

// Register necessary components for chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface ProgressMetric {
  date: string;
  metric_type: string;
  value: string | number;
}

interface ProgressMetricsProps {
  progressData: ProgressMetric[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const res = await fetch('http://localhost:3000/api/progressMetrics');
  const progressData = await res.json();
  return { props: { progressData } };
};

// Helper function to convert MM:SS pace format to decimal minutes
const convertPaceToMinutes = (pace: string): number => {
  const [minutes, seconds] = pace.split(':').map(Number);
  return minutes + seconds / 60;
};

// Helper function to convert decimal minutes back to MM:SS format
const formatMinutesToPace = (decimalMinutes: number): string => {
  const minutes = Math.floor(decimalMinutes);
  const seconds = Math.round((decimalMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const calculateWeeklyAverages = (data: ProgressMetric[], metricType: string, isPace = false) => {
  const uniqueWeeklyData = Array.from(
    new Map(
      data
        .filter((metric) => metric.metric_type === metricType)
        .map((item) => [dayjs(item.date).startOf('week').format('YYYY-MM-DD'), item])
    ).values()
  );

  const recentWeeks = uniqueWeeklyData
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .reverse();

  // Convert all values to numbers, converting pace data if required
  const weeklyAverages = recentWeeks.map((item) =>
    isPace && typeof item.value === 'string'
      ? convertPaceToMinutes(item.value)
      : Number(item.value) // Ensure other values are also converted to numbers
  );

  const dates = recentWeeks.map((item) => dayjs(item.date).format('MM/DD'));
  const currentAverage = weeklyAverages[weeklyAverages.length - 1] || 0;

  // Calculate the change over 5 weeks, ensuring the values are numbers and rounding to 1 decimal
  const change = weeklyAverages.length >= 2
    ? +(weeklyAverages[weeklyAverages.length - 1] - weeklyAverages[0]).toFixed(1)
    : 0;

  return { weeklyAverages, currentAverage, dates, change };
};

const ProgressMetrics: React.FC<ProgressMetricsProps> = ({ progressData }) => {
  const { weeklyAverages: zone2Averages, currentAverage: currentZone2, dates: zone2Dates, change: zone2Change } = calculateWeeklyAverages(progressData, "weekly_z2_average");
  const { weeklyAverages: paceAverages, currentAverage: currentPace, dates: paceDates, change: paceChange } = calculateWeeklyAverages(progressData, "weekly_pace", true);

  const zone2ChartData = {
    labels: zone2Dates,
    datasets: [
      {
        data: zone2Averages,
        fill: false,
        borderColor: "#3b82f6",
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const paceChartData = {
    labels: paceDates,
    datasets: [
      {
        data: paceAverages,
        fill: false,
        borderColor: "#ef4444",
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
        ticks: {
          stepSize: 5,
          callback: (value: any) => `${value}%`,
        },
        grid: {
          display: true,
          color: "#e5e7eb",
          lineWidth: 0.5,
        },
      },
    },
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Zone 2 Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Zone 2 Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={zone2ChartData} options={chartOptions} />
            <div className="flex justify-between items-end mt-4">
              <div className="text-left">
                <p className="text-sm text-gray-500">Current</p>
                <p className="text-l font-semibold">{currentZone2}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Change</p>
                <div className={`flex items-center ${zone2Change >= 0 ? 'text-green-500' : 'text-red-500'} text-l`}>
                  {zone2Change >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                  <span className="ml-1">
                    {zone2Change >= 0 ? `+${zone2Change}%` : `${zone2Change}%`} in 5 weeks
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pace Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Pace Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={paceChartData} options={{
              ...chartOptions,
              scales: {
                y: {
                  display: true,
                  ticks: {
                    callback: (value: any) => `${Math.floor(value)}:${Math.round((value % 1) * 60).toString().padStart(2, '0')}`,
                  },
                  grid: {
                    display: true,
                    color: "#e5e7eb",
                  },
                },
              },
            }} />
            <div className="flex justify-between items-end mt-4">
              <div className="text-left">
                <p className="text-sm text-gray-500">Current Pace</p>
                <p className="text-l font-semibold">{formatMinutesToPace(currentPace as number)} min/km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Change</p>
                <div className={`flex items-center ${paceChange <= 0 ? 'text-green-500' : 'text-red-500'} text-l`}>
                  {paceChange <= 0 ? <FaArrowDown /> : <FaArrowUp />}
                  <span className="ml-1">
                    {paceChange <= 0 ? `-${formatMinutesToPace(Math.abs(paceChange))}` : `+${formatMinutesToPace(paceChange)}`} in 5 weeks
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProgressMetrics;