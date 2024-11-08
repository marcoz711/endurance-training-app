import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useTrainingPlan from '@/src/useTrainingPlan';

const ProgressTab: React.FC = () => {
  const { data, loading, error } = useTrainingPlan();

  if (loading) return <p>Loading progress data...</p>;
  if (error) return <p>Error loading progress data: {error.message}</p>;

  const progressData = Array.isArray(data?.progress) ? data.progress : [];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Zone 2 Time Trend</h2>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="z2Percentage" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Plan Adherence Trend</h2>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="planAdherence" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Average Pace Trend</h2>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="avgPace" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTab;