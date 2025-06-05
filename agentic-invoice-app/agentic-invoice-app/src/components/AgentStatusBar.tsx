import { useState, useEffect } from 'react';

export default function AgentStatusBar() {
  const [agentStatus, setAgentStatus] = useState('AI Agent Active');
  const [activity, setActivity] = useState('Processing invoice patterns...');
  const [queue, setQueue] = useState('Queue: 30');
  const [savedToday, setSavedToday] = useState('Saved Today: $4,280');
  
  const activities = [
    'Processing invoice patterns...',
    'Analyzing vendor compliance...',
    'Matching line items...',
    'Detecting duplicates...',
    'Validating tax calculations...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActivity(activities[Math.floor(Math.random() * activities.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-8">
            <img src="/xelix_logo.svg" alt="Xelix" className="h-8" />
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">{agentStatus}</span>
              </div>
              <span className="text-sm text-gray-500 ml-4">{activity}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Queue</div>
              <div className="text-lg font-semibold">30</div>
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