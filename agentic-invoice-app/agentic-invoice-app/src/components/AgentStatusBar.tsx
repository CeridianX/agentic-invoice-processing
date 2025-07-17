import { useState, useEffect } from 'react';
import { invoiceService } from '../services/api';

// Global queue state for optimistic updates
let globalQueueCount = 0;
let globalQueueListeners: ((count: number) => void)[] = [];

export const updateQueueCountOptimistically = (count: number) => {
  globalQueueCount = count;
  globalQueueListeners.forEach(listener => listener(count));
};

export const decrementQueueCountOptimistically = () => {
  globalQueueCount = Math.max(0, globalQueueCount - 1);
  globalQueueListeners.forEach(listener => listener(globalQueueCount));
};

export default function AgentStatusBar() {
  const [agentStatus, setAgentStatus] = useState('AI Agent Active');
  const [activity, setActivity] = useState('Processing invoice patterns...');
  const [queueCount, setQueueCount] = useState(0);
  const [savedToday, setSavedToday] = useState('Saved Today: $4,280');
  
  const activities = [
    'Processing invoice patterns...',
    'Analyzing vendor compliance...',
    'Matching line items...',
    'Detecting duplicates...',
    'Validating tax calculations...'
  ];

  // Fetch queue status (but only for fallback, optimistic updates take priority)
  const fetchQueueStatus = async (forceUpdate = false) => {
    try {
      const queueStatus = await invoiceService.getQueueStatus();
      // Only update if we don't have optimistic updates or if forced
      if (forceUpdate || globalQueueCount === 0) {
        const newCount = queueStatus.total;
        globalQueueCount = newCount;
        setQueueCount(newCount);
      }
    } catch (error) {
      console.error('Failed to fetch queue status:', error);
    }
  };

  useEffect(() => {
    // Register listener for optimistic updates
    const handleOptimisticUpdate = (count: number) => {
      setQueueCount(count);
    };
    globalQueueListeners.push(handleOptimisticUpdate);

    // Initial fetch
    fetchQueueStatus(true);

    // Activity rotation
    const activityInterval = setInterval(() => {
      setActivity(activities[Math.floor(Math.random() * activities.length)]);
    }, 3000);

    // Reduced polling frequency since we have optimistic updates
    const queueInterval = setInterval(() => fetchQueueStatus(false), 5000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(queueInterval);
      // Remove listener
      globalQueueListeners = globalQueueListeners.filter(l => l !== handleOptimisticUpdate);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-8">
            <img src="/xelix_logo.svg" alt="Xelix" className="h-8" />
            
            <div className="flex items-center bg-gray-50 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium text-gray-700 mr-2">{agentStatus}</span>
              <span className="text-sm text-gray-500">• {activity}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Queue</div>
              <div className="text-lg font-semibold transition-all duration-300 ease-in-out">{queueCount}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Saved Today</div>
              <div className="text-lg font-semibold text-green-600">$4,280</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}