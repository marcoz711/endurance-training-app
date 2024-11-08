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

  // Handle activity type change (to determine if additional fields are needed)
  const handleActivityTypeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const value = e.target.value;
    setActivityType(value);
    setFormData({ ...formData, exercise_type: value === 'Other' ? '' : value });
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
    if (formData.pace && !pacePattern.test(formData.pace)) {
      return 'Pace must be in MM:SS format';
    }

    const numericFields = ['distance', 'avg_hr', 'max_hr', 'z2_percent', 'above_z2_percent', 'below_z2_percent'];
    for (const field of numericFields) {
      if (formData[field] && isNaN(Number(formData[field]))) {
        return `${field.replace(/_/g, ' ')} must be a valid number.`;
      }
    }

    if (
      formData.z2_percent && (Number(formData.z2_percent) < 0 || Number(formData.z2_percent) > 100) ||
      formData.above_z2_percent && (Number(formData.above_z2_percent) < 0 || Number(formData.above_z2_percent) > 100) ||
      formData.below_z2_percent && (Number(formData.below_z2_percent) < 0 || Number(formData.below_z2_percent) > 100)
    ) {
      return 'Percentages must be between 0 and 100';
    }

    // Check if Zone 2 percentages sum to 100
    const totalPercentage = ['z2_percent', 'above_z2_percent', 'below_z2_percent']
      .reduce((sum, field) => sum + (Number(formData[field]) || 0), 0);
    if (totalPercentage !== 100) {
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

    const res = await fetch('/api/logActivity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
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
          <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </label>

        <label>
          Time (HH:MM:SS):
          <input type="text" name="timestamp" value={formData.timestamp} onChange={handleChange} required placeholder="HH:MM:SS" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </label>

        <label>
          Activity Type:
          <select name="activityType" value={activityType} onChange={handleActivityTypeChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
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
            <input type="text" name="exercise_type" value={formData.exercise_type} onChange={handleChange} required placeholder="Enter activity name" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </label>
        )}

        <label>
          Duration (HH:MM:SS):
          <input type="text" name="duration" value={formData.duration} onChange={handleChange} required placeholder="HH:MM:SS" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </label>

        {activityType === 'Run' && (
          <>
            <label>
              Distance (km):
              <input type="number" name="distance" value={formData.distance} onChange={handleChange} placeholder="Distance in kilometers" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Average Heart Rate:
              <input type="number" name="avg_hr" value={formData.avg_hr} onChange={handleChange} placeholder="Average heart rate" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Max Heart Rate:
              <input type="number" name="max_hr" value={formData.max_hr} onChange={handleChange} placeholder="Max heart rate" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Zone 2 %:
              <input type="number" name="z2_percent" value={formData.z2_percent} onChange={handleChange} placeholder="Zone 2 percentage" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Above Zone 2 %:
              <input type="number" name="above_z2_percent" value={formData.above_z2_percent} onChange={handleChange} placeholder="Above Zone 2 percentage" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Below Zone 2 %:
              <input type="number" name="below_z2_percent" value={formData.below_z2_percent} onChange={handleChange} placeholder="Below Zone 2 percentage" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>

            <label>
              Pace (MM:SS):
              <input type="text" name="pace" value={formData.pace} onChange={handleChange} placeholder="Pace (MM:SS)" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </label>
          </>
        )}

        <label>
          Notes:
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
        </label>

        <button type="submit" style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>Log Activity</button>
      </form>
    </div>
  );
};

export default LogActivity;