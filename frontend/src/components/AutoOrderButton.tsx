"use client";

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AutoOrderButton() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (user?.role !== 'manager') return null;

  const handleRunForecast = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await apiFetch('/api/forecast/run-weekly', {
        method: 'POST',
      });
      
      setMessage({ 
        text: response.message || 'Weekly forecast complete. Deficits scheduled.', 
        type: 'success' 
      });
      
      // Optional: auto-hide the success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
      
    } catch (error: any) {
      setMessage({ 
        text: error.message || 'An error occurred while running the forecast.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleRunForecast}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? 'Processing...' : 'Run Weekly AI Forecast'}
      </button>
      
      {message && (
        <div 
          className={`text-sm px-3 py-2 rounded-md shadow-sm border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
