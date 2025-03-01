// pages/progressMetrics.tsx

import Layout from '../components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import { GetServerSideProps } from 'next';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import dayjs from 'dayjs';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';

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

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const baseUrl = req.headers.host ? `http://${req.headers.host}` : 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/progressMetrics`);
  const progressData = await res.json();
  return { props: { progressData } };
};

// Helper function to convert HH:MM:SS or M:SS pace format to decimal hours
const convertPaceToHours = (pace: string): number => {
  const parts = pace.split(':').map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours + minutes / 60 + seconds / 3600;
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes / 60 + seconds / 3600;
  }
  return 0; // Fallback if format is incorrect
};

// Helper function to convert decimal hours back to HH:MM:SS or M:SS format
const formatHoursToPace = (decimalHours: number): string => {
  const isNegative = decimalHours < 0;
  const absoluteHours = Math.abs(decimalHours);

  const hours = Math.floor(absoluteHours);
  const minutes = Math.floor((absoluteHours - hours) * 60);
  const seconds = Math.round(((absoluteHours - hours) * 60 - minutes) * 60);

  if (hours > 0) {
    return `${isNegative ? '-' : ''}${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${isNegative ? '-' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const calculateWeeklyAverages = (
  data: ProgressMetric[],
  metricType: string,
  isPace = false,
  allWeeks: string[] = []
) => {
  const uniqueWeeklyData = Array.from(
    new Map(
      data
        .filter((metric) => metric.metric_type === metricType)
        .map((item) => [dayjs(item.date).startOf('week').add(1, 'day').format('YYYY-MM-DD'), item])
    ).values()
  );

  const weeks = allWeeks.length > 0 ? allWeeks : uniqueWeeklyData.map((item) => dayjs(item.date).startOf('week').add(1, 'day').format('YYYY-MM-DD'));

  const weeklyAverages = weeks.map((week) => {
    const entry = uniqueWeeklyData.find((item) => dayjs(item.date).startOf('week').add(1, 'day').format('YYYY-MM-DD') === week);
    if (entry && entry.value !== 'N/A') {
      return isPace && typeof entry.value === 'string' ? convertPaceToHours(entry.value) : Number(entry.value);
    }
    return 0; // Default to 0 for missing data
  });

  const dates = weeks.map((week) => dayjs(week).format('MM/DD'));

  const validAverages = weeklyAverages.filter((value) => value !== null) as number[];
  const currentAverage = validAverages[validAverages.length - 1] || 0;

  let change;
  if (validAverages.length >= 2) {
    const difference = validAverages[validAverages.length - 1] - validAverages[0];
    change = isPace
      ? formatHoursToPace(difference)
      : `${((difference / validAverages[0]) * 100).toFixed(1)}%`;
  } else {
    change = isPace ? '00:00' : '0%';
  }

  return { weeklyAverages, currentAverage, dates, change };
};

const ProgressMetrics: React.FC<ProgressMetricsProps> = ({ progressData }) => {
  const [range, setRange] = useState<'all' | '12weeks' | '6weeks'>('12weeks');
  
  // Add this - fetch raw activity data for detailed 6-week view
  const sixWeeksAgo = dayjs().subtract(6, 'weeks').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');
  const { activities, isLoading } = useActivities(sixWeeksAgo, today);
  
  // Filter only running activities
  const runningActivities = activities?.filter(activity => 
    activity.exercise_type.toLowerCase().includes('run')
  ) || [];
  
  // Sort by date ascending
  const sortedRunningActivities = [...runningActivities].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Create detailed charts for 6-week view
  const detailedChartData = {
    labels: sortedRunningActivities.map(activity => dayjs(activity.date).format('MM/DD')),
    datasets: [
      {
        label: 'Z2 %',
        data: sortedRunningActivities.map(activity => 
          typeof activity.z2_percent === 'string' 
            ? parseFloat(activity.z2_percent) 
            : activity.z2_percent || 0
        ),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        yAxisID: 'percentAxis',
      },
      {
        label: 'MAF %',
        data: sortedRunningActivities.map(activity => 
          typeof activity.maf_zone_percent === 'string' 
            ? parseFloat(activity.maf_zone_percent) 
            : activity.maf_zone_percent || 0
        ),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        yAxisID: 'percentAxis',
      },
      {
        label: 'Pace',
        data: sortedRunningActivities.map(activity => 
          activity.pace ? convertPaceToHours(activity.pace) : null
        ),
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        yAxisID: 'paceAxis',
      }
    ],
  };

  const detailedChartOptions = {
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.dataset.label === 'Pace') {
              return ` ${formatHoursToPace(context.raw)}`;
            }
            return ` ${Math.round(context.raw)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      percentAxis: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Percentage'
        },
        min: 0,
        max: 100,
      },
      paceAxis: {
        type: 'linear',
        position: 'right',
        title: {
          display: true,
          text: 'Pace'
        },
        ticks: {
          callback: (value: any) => formatHoursToPace(value as number),
        },
        grid: {
          display: false,
        },
      }
    },
  };

  // Create separate charts for detailed 6-week view
  const detailedZ2ChartData = {
    labels: sortedRunningActivities.map(activity => dayjs(activity.date).format('MM/DD')),
    datasets: [{
      data: sortedRunningActivities.map(activity => 
        typeof activity.z2_percent === 'string' 
          ? parseFloat(activity.z2_percent) 
          : activity.z2_percent || 0
      ),
      fill: false,
      borderColor: '#3b82f6',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.2,
    }]
  };

  const detailedMafChartData = {
    labels: sortedRunningActivities.map(activity => dayjs(activity.date).format('MM/DD')),
    datasets: [{
      data: sortedRunningActivities.map(activity => 
        typeof activity.maf_zone_percent === 'string' 
          ? parseFloat(activity.maf_zone_percent) 
          : activity.maf_zone_percent || 0
      ),
      fill: false,
      borderColor: '#10b981',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.2,
    }]
  };

  const detailedPaceChartData = {
    labels: sortedRunningActivities.map(activity => dayjs(activity.date).format('MM/DD')),
    datasets: [{
      data: sortedRunningActivities.map(activity => 
        activity.pace ? convertPaceToHours(activity.pace) : null
      ),
      fill: false,
      borderColor: '#ef4444',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.2,
    }]
  };

  // Rename these variables to avoid conflicts with weekly data
  const detailedCurrentZ2 = sortedRunningActivities.length > 0 
    ? Math.round(Number(sortedRunningActivities[sortedRunningActivities.length - 1].z2_percent || 0))
    : 0;

  const detailedCurrentMaf = sortedRunningActivities.length > 0 
    ? Math.round(Number(sortedRunningActivities[sortedRunningActivities.length - 1].maf_zone_percent || 0))
    : 0;

  const detailedCurrentPace = sortedRunningActivities.length > 0 && sortedRunningActivities[sortedRunningActivities.length - 1].pace
    ? sortedRunningActivities[sortedRunningActivities.length - 1].pace
    : "0:00";

  // Calculate changes
  const calculateChange = (firstValue: number | string | undefined, lastValue: number | string | undefined, isPace: boolean) => {
    if (!firstValue || !lastValue) return isPace ? "0:00" : "0%";
    
    const first = typeof firstValue === 'string' ? parseFloat(firstValue) : firstValue;
    const last = typeof lastValue === 'string' ? parseFloat(lastValue) : lastValue;
    
    if (isPace) {
      const firstPace = typeof firstValue === 'string' ? convertPaceToHours(firstValue) : first;
      const lastPace = typeof lastValue === 'string' ? convertPaceToHours(lastValue as string) : last;
      return formatHoursToPace(lastPace - firstPace);
    }
    
    return first === 0 ? "0%" : `${((last - first) / first * 100).toFixed(1)}%`;
  };

  // Rename the individual activity change variables to avoid naming conflicts
  const detailedZ2Change = sortedRunningActivities.length > 1
    ? calculateChange(
        sortedRunningActivities[0].z2_percent,
        sortedRunningActivities[sortedRunningActivities.length - 1].z2_percent,
        false
      )
    : "0%";

  const detailedMafChange = sortedRunningActivities.length > 1
    ? calculateChange(
        sortedRunningActivities[0].maf_zone_percent,
        sortedRunningActivities[sortedRunningActivities.length - 1].maf_zone_percent,
        false
      )
    : "0%";

  const detailedPaceChange = sortedRunningActivities.length > 1
    ? calculateChange(
        sortedRunningActivities[0].pace,
        sortedRunningActivities[sortedRunningActivities.length - 1].pace,
        true
      )
    : "0:00";

  const filterByRange = (data: ProgressMetric[], range: 'all' | '12weeks' | '6weeks') => {
    const weeksToInclude = {
      '6weeks': 6,
      '12weeks': 12,
    }[range];

    if (range === 'all') return data;

    const today = dayjs();
    return data.filter((item) => {
      const weeksAgo = today.diff(dayjs(item.date), 'week');
      return weeksAgo < weeksToInclude;
    });
  };

  const filteredProgressData = filterByRange(progressData, range);

  const allWeeks = Array.from(
    new Set(
      filteredProgressData.map((item) => dayjs(item.date).startOf('week').add(1, 'day').format('YYYY-MM-DD'))
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const { weeklyAverages: zone2Averages, currentAverage: currentZone2, dates: zone2Dates, change: zone2Change } =
    calculateWeeklyAverages(filteredProgressData, 'weekly_z2_average', false, allWeeks);
  const { weeklyAverages: paceAverages, currentAverage: currentPace, dates: paceDates, change: paceChange } =
    calculateWeeklyAverages(filteredProgressData, 'weekly_pace', true, allWeeks);
  const { 
    weeklyAverages: mafAverages, 
    currentAverage: currentMaf, 
    dates: mafDates, 
    change: mafChange 
  } = calculateWeeklyAverages(filteredProgressData, 'weekly_maf_average', false, allWeeks);

  const zone2ChartData = {
    labels: zone2Dates,
    datasets: [
      {
        data: zone2Averages,
        fill: false,
        borderColor: '#3b82f6',
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
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const mafChartData = {
    labels: mafDates,
    datasets: [
      {
        data: mafAverages,
        fill: false,
        borderColor: '#10b981', // Green color
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  };

  const paceChartOptions = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return ` ${formatHoursToPace(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
        ticks: {
          callback: (value: any) => formatHoursToPace(value as number),
        },
        grid: {
          display: true,
          color: '#e5e7eb',
          lineWidth: 0.5,
        },
      },
    },
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/progressMetrics');
        // ... rest of the code ...
      } catch (error) {
        // Keep error logging for user feedback
        console.error("Error fetching metrics:", error);
      }
    };
    
    fetchMetrics();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setRange('6weeks')}
            className={`px-4 py-2 rounded ${range === '6weeks' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Last 6 Weeks
          </button>
          <button
            onClick={() => setRange('12weeks')}
            className={`px-4 py-2 rounded ${range === '12weeks' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Last 12 Weeks
          </button>
          <button
            onClick={() => setRange('all')}
            className={`px-4 py-2 rounded ${range === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            All Weeks
          </button>
        </div>

        {range === '6weeks' ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Pace Progress (Individual Activities)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading activity data...</div>
                ) : sortedRunningActivities.length === 0 ? (
                  <div className="text-center py-8">No running activities found in the last 6 weeks</div>
                ) : (
                  <>
                    <Line data={detailedPaceChartData} options={paceChartOptions} />
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-left">
                        <p className="text-sm text-gray-500">Current Pace</p>
                        <p className="text-l font-semibold">{detailedCurrentPace} min/km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Change</p>
                        <div className={`flex items-center ${String(detailedPaceChange).startsWith('-') ? 'text-green-500' : 'text-red-500'} text-l`}>
                          {String(detailedPaceChange).startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                          <span className="ml-1">{detailedPaceChange} in last 6 weeks</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MAF Zone Progress (Individual Activities)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading activity data...</div>
                ) : sortedRunningActivities.length === 0 ? (
                  <div className="text-center py-8">No running activities found in the last 6 weeks</div>
                ) : (
                  <>
                    <Line data={detailedMafChartData} options={{ plugins: { legend: { display: false } } }} />
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-left">
                        <p className="text-sm text-gray-500">Current</p>
                        <p className="text-l font-semibold">{detailedCurrentMaf}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Change</p>
                        <div className={`flex items-center ${detailedMafChange.startsWith('-') ? 'text-red-500' : 'text-green-500'} text-l`}>
                          {detailedMafChange.startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                          <span className="ml-1">{detailedMafChange} in last 6 weeks</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zone 2 Progress (Individual Activities)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading activity data...</div>
                ) : sortedRunningActivities.length === 0 ? (
                  <div className="text-center py-8">No running activities found in the last 6 weeks</div>
                ) : (
                  <>
                    <Line data={detailedZ2ChartData} options={{ plugins: { legend: { display: false } } }} />
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-left">
                        <p className="text-sm text-gray-500">Current</p>
                        <p className="text-l font-semibold">{detailedCurrentZ2}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Change</p>
                        <div className={`flex items-center ${detailedZ2Change.startsWith('-') ? 'text-red-500' : 'text-green-500'} text-l`}>
                          {detailedZ2Change.startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                          <span className="ml-1">{detailedZ2Change} in last 6 weeks</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Pace Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Line data={paceChartData} options={paceChartOptions} />
                <div className="flex justify-between items-end mt-4">
                  <div className="text-left">
                    <p className="text-sm text-gray-500">Current Pace</p>
                    <p className="text-l font-semibold">{formatHoursToPace(currentPace as number)} min/km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Change</p>
                    <div className={`flex items-center ${String(paceChange).startsWith('-') ? 'text-green-500' : 'text-red-500'} text-l`}>
                      {String(paceChange).startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                      <span className="ml-1">{paceChange} in {range === 'all' ? 'all time' : range.replace('weeks', ' weeks')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MAF Zone Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Line data={mafChartData} options={{ plugins: { legend: { display: false } } }} />
                <div className="flex justify-between items-end mt-4">
                  <div className="text-left">
                    <p className="text-sm text-gray-500">Current</p>
                    <p className="text-l font-semibold">{currentMaf}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Change</p>
                    <div className={`flex items-center ${mafChange.startsWith('-') ? 'text-red-500' : 'text-green-500'} text-l`}>
                      {mafChange.startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                      <span className="ml-1">{mafChange} in {range === 'all' ? 'all time' : range.replace('weeks', ' weeks')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zone 2 Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Line data={zone2ChartData} options={{ plugins: { legend: { display: false } } }} />
                <div className="flex justify-between items-end mt-4">
                  <div className="text-left">
                    <p className="text-sm text-gray-500">Current</p>
                    <p className="text-l font-semibold">{currentZone2}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Change</p>
                    <div className={`flex items-center ${zone2Change.startsWith('-') ? 'text-red-500' : 'text-green-500'} text-l`}>
                      {zone2Change.startsWith('-') ? <FaArrowDown /> : <FaArrowUp />}
                      <span className="ml-1">{zone2Change} in {range === 'all' ? 'all time' : range.replace('weeks', ' weeks')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProgressMetrics;