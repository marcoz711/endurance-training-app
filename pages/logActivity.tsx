// pages/logActivity.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

const LogActivity = () => {
  const router = useRouter();
  const [activityType, setActivityType] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    timestamp: '',
    exercise_type: '',
    duration: '',
    distance: '',
    avg_hr: '',
    max_hr: '',
    z2_percent: '',
    above_z2_percent: '',
    below_z2_percent: '',
    pace: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleActivityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActivityType(value);
    setFormData({ ...formData, exercise_type: value === 'Other' ? '' : value });

    if (value !== 'Run') {
      setFormData((prevData) => ({
        ...prevData,
        distance: '',
        avg_hr: '',
        max_hr: '',
        z2_percent: '',
        above_z2_percent: '',
        below_z2_percent: '',
        pace: '',
      }));
    }
  };

  const validateFormData = () => {
    const durationPattern = /^(\d{2}):(\d{2}):(\d{2})$/;
    const pacePattern = /^(\d{2}):(\d{2}):(\d{2})$/;

    if (!formData.date || !formData.timestamp || !formData.exercise_type || !formData.duration) {
      return 'Please fill out all required fields.';
    }

    // Prevent future dates
    const selectedDate = new Date(formData.date);
    const today = new Date();
    if (selectedDate > today) {
      return 'The date cannot be in the future.';
    }

    if (!durationPattern.test(formData.duration)) {
      return 'Duration must be in HH:MM:SS format';
    }
    if (activityType === 'Run' && formData.pace && !pacePattern.test(formData.pace)) {
      return 'Pace must be in HH:MM:SS format';
    }

    const numericFields = ['distance', 'avg_hr', 'max_hr', 'z2_percent', 'above_z2_percent', 'below_z2_percent'];
    for (const field of numericFields) {
      if (activityType === 'Run' && formData[field] && isNaN(Number(formData[field]))) {
        return `${field.replace(/_/g, ' ')} must be a valid number.`;
      }
    }

    if (
      activityType === 'Run' &&
      (Number(formData.z2_percent || 0) + Number(formData.above_z2_percent || 0) + Number(formData.below_z2_percent || 0)) !== 100
    ) {
      return 'Zone percentages (Z2, Above Z2, Below Z2) must sum up to 100';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateFormData();
    if (validationError) {
      setError(validationError);
      return;
    }

    const dataToSubmit = { ...formData };
    if (activityType !== 'Run') {
      delete dataToSubmit.distance;
      delete dataToSubmit.avg_hr;
      delete dataToSubmit.max_hr;
      delete dataToSubmit.z2_percent;
      delete dataToSubmit.above_z2_percent;
      delete dataToSubmit.below_z2_percent;
      delete dataToSubmit.pace;
    }

    const res = await fetch('/api/logActivity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSubmit),
    });

    if (res.ok) {
      setSuccess('Activity logged successfully!');
      setFormData({
        date: '',
        timestamp: '',
        exercise_type: '',
        duration: '',
        distance: '',
        avg_hr: '',
        max_hr: '',
        z2_percent: '',
        above_z2_percent: '',
        below_z2_percent: '',
        pace: '',
        notes: '',
      });

    //  await fetch('/api/calculateWeeklyMetrics', {
    //    method: 'POST',
    //    headers: { 'Content-Type': 'application/json' },
    //    body: JSON.stringify({ date: formData.date }),
    //  });

      router.push('/today');
    } else {
      const errorData = await res.json();
      setError(errorData.error || 'An error occurred while logging the activity.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-4">Log Activity</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-gray-700">Date:</span>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Time (HH:MM:SS):</span>
          <input type="text" name="timestamp" value={formData.timestamp} onChange={handleChange} required placeholder="HH:MM:SS" className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Activity Type:</span>
          <select name="activityType" value={activityType} onChange={handleActivityTypeChange} required className="mt-1 block w-full border rounded-md p-2">
            <option value="">Select Type</option>
            <option value="Run">Run</option>
            <option value="Strength">Strength</option>
            <option value="Cycling">Cycling</option>
            <option value="Swimming">Swimming</option>
            <option value="Other">Other</option>
          </select>
        </label>

        {activityType === 'Other' && (
          <label className="block">
            <span className="text-gray-700">Specify Activity Type:</span>
            <input type="text" name="exercise_type" value={formData.exercise_type} onChange={handleChange} required placeholder="Enter activity name" className="mt-1 block w-full border rounded-md p-2" />
          </label>
        )}

        <label className="block">
          <span className="text-gray-700">Duration (HH:MM:SS):</span>
          <input type="text" name="duration" value={formData.duration} onChange={handleChange} required placeholder="HH:MM:SS" className="mt-1 block w-full border rounded-md p-2" />
        </label>

        {activityType === 'Run' && (
          <>
            <label className="block">
              <span className="text-gray-700">Distance (km):</span>
              <input type="number" name="distance" value={formData.distance} onChange={handleChange} required placeholder="Distance in kilometers" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Average Heart Rate:</span>
              <input type="number" name="avg_hr" value={formData.avg_hr} onChange={handleChange} required placeholder="Average heart rate" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Max Heart Rate:</span>
              <input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} required placeholder="Max heart rate" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Zone 2 %:</span>
              <input type="number" name="z2_percent" value={formData.z2_percent} onChange={handleChange} required placeholder="Zone 2 percentage" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Above Zone 2 %:</span>
              <input type="number" name="above_z2_percent" value={formData.above_z2_percent} onChange={handleChange} required placeholder="Above Zone 2 percentage" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Below Zone 2 %:</span>
              <input type="number" name="below_z2_percent" value={formData.below_z2_percent} onChange={handleChange} required placeholder="Below Zone 2 percentage" className="mt-1 block w-full border rounded-md p-2" />
            </label>

            <label className="block">
              <span className="text-gray-700">Pace (HH:MM:SS):</span>
              <input type="text" name="pace" value={formData.pace} onChange={handleChange} required placeholder="Pace (HH:MM:SS)" className="mt-1 block w-full border rounded-md p-2" />
            </label>
          </>
        )}

        <label className="block">
          <span className="text-gray-700">Notes:</span>
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">
          Log Activity
        </button>
      </form>
    </div>
  );
};

export default LogActivity;