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

  // Handle change for input fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle activity type change
  const handleActivityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setActivityType(value);
    setFormData({ ...formData, exercise_type: value === 'Other' ? '' : value });

    // Clear run-specific fields if activity type is not 'Run'
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

  // Form data validation
  const validateFormData = () => {
    const durationPattern = /^(\d{2}):(\d{2}):(\d{2})$/;
    const pacePattern = /^(\d{2}):(\d{2})$/;

    if (!formData.date || !formData.timestamp || !formData.exercise_type || !formData.duration) {
      return 'Please fill out all required fields.';
    }
    if (!durationPattern.test(formData.duration)) {
      return 'Duration must be in HH:MM:SS format';
    }
    if (activityType === 'Run' && formData.pace && !pacePattern.test(formData.pace)) {
      return 'Pace must be in MM:SS format';
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateFormData();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Filter out run-specific fields if activity type is not 'Run'
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
      router.push('/today');
    } else {
      const errorData = await res.json();
      setError(errorData.error || 'An error occurred while logging the activity.');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Log Activity</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label>
          Date:
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </label>

        <label>
          Time (HH:MM:SS):
          <input type="text" name="timestamp" value={formData.timestamp} onChange={handleChange} required placeholder="HH:MM:SS" />
        </label>

        <label>
          Activity Type:
          <select name="activityType" value={activityType} onChange={handleActivityTypeChange} required>
            <option value="">Select Type</option>
            <option value="Run">Run</option>
            <option value="Strength">Strength</option>
            <option value="Cycling">Cycling</option>
            <option value="Swimming">Swimming</option>
            <option value="Other">Other</option>
          </select>
        </label>

        {activityType === 'Other' && (
          <label>
            Specify Activity Type:
            <input type="text" name="exercise_type" value={formData.exercise_type} onChange={handleChange} required placeholder="Enter activity name" />
          </label>
        )}

        <label>
          Duration (HH:MM:SS):
          <input type="text" name="duration" value={formData.duration} onChange={handleChange} required placeholder="HH:MM:SS" />
        </label>

        {activityType === 'Run' && (
          <>
            <label>
              Distance (km):
              <input type="number" name="distance" value={formData.distance} onChange={handleChange} placeholder="Distance in kilometers" />
            </label>

            <label>
              Average Heart Rate:
              <input type="number" name="avg_hr" value={formData.avg_hr} onChange={handleChange} placeholder="Average heart rate" />
            </label>

            <label>
              Max Heart Rate:
              <input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} placeholder="Max heart rate" />
            </label>

            <label>
              Zone 2 %:
              <input type="number" name="z2_percent" value={formData.z2_percent} onChange={handleChange} placeholder="Zone 2 percentage" />
            </label>

            <label>
              Above Zone 2 %:
              <input type="number" name="above_z2_percent" value={formData.above_z2_percent} onChange={handleChange} placeholder="Above Zone 2 percentage" />
            </label>

            <label>
              Below Zone 2 %:
              <input type="number" name="below_z2_percent" value={formData.below_z2_percent} onChange={handleChange} placeholder="Below Zone 2 percentage" />
            </label>

            <label>
              Pace (MM:SS):
              <input type="text" name="pace" value={formData.pace} onChange={handleChange} placeholder="Pace (MM:SS)" />
            </label>
          </>
        )}

        <label>
          Notes:
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" />
        </label>

        <button type="submit" className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md">
          Log Activity
        </button>
      </form>
    </div>
  );
};

export default LogActivity;