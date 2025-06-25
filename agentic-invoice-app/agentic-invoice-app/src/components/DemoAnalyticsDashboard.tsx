import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Brain, Zap } from 'lucide-react';

interface DemoStats {
  totalInvoices: number;
  processedInvoices: number;
  scenarioBreakdown: Record<string, number>;
  averageProcessingTime?: number;
  confidenceDistribution?: Record<string, number>;
  workflowRoutes?: Record<string, number>;
}

interface ProcessingMetrics {
  scenario: string;
  count: number;
  avgTime: number;
  avgConfidence: number;
}

interface DemoAnalyticsDashboardProps {
  className?: string;
}

const SCENARIO_COLORS = {
  simple: '#10B981',
  complex: '#F59E0B',
  duplicate: '#EF4444',
  exceptional: '#8B5CF6',
  learning: '#06B6D4',
  poor_quality: '#F97316'
};

export default function DemoAnalyticsDashboard({ className = '' }: DemoAnalyticsDashboardProps) {
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemoStats();
    const interval = setInterval(fetchDemoStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDemoStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/demo/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        
        // Transform scenario breakdown into metrics
        const metrics = Object.entries(data.stats.scenarioBreakdown || {}).map(([scenario, count]) => ({
          scenario,
          count: count as number,
          avgTime: 2 + Math.random() * 4, // Simulated avg processing time
          avgConfidence: 85 + Math.random() * 12 // Simulated avg confidence
        }));
        setProcessingMetrics(metrics);
      }
    } catch (error) {
      console.error('Failed to fetch demo stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const processedPercentage = stats ? Math.round((stats.processedInvoices / stats.totalInvoices) * 100) : 0;
  
  // Prepare data for charts
  const scenarioData = Object.entries(stats?.scenarioBreakdown || {}).map(([scenario, count]) => ({
    name: scenario.replace('_', ' '),
    value: count,
    color: SCENARIO_COLORS[scenario as keyof typeof SCENARIO_COLORS] || '#6B7280'
  }));

  const timeSeriesData = processingMetrics.map((metric, index) => ({
    time: `T${index + 1}`,
    processed: metric.count,
    confidence: metric.avgConfidence
  }));

  return (
    <div className={`${className} space-y-6`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <TrendingUp size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Demo Analytics Dashboard</h2>
          <p className="text-sm text-gray-600">Agent Zero processing insights and performance metrics</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalInvoices || 0}</div>
              <div className="text-xs text-gray-600">Total Invoices</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Brain size={16} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.processedInvoices || 0}</div>
              <div className="text-xs text-gray-600">AI Processed</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap size={16} className="text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{processedPercentage}%</div>
              <div className="text-xs text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">3.2s</div>
              <div className="text-xs text-gray-600">Avg Processing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Breakdown Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={scenarioData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {scenarioData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Processing Time Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="processed" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Processed Count"
              />
              <Line 
                type="monotone" 
                dataKey="confidence" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Avg Confidence %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario Performance Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={processingMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="scenario" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" name="Count" />
              <Bar dataKey="avgConfidence" fill="#10B981" name="Avg Confidence %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Zero Intelligence Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-blue-600" />
                <span className="font-medium text-blue-900">Learning Progress</span>
              </div>
              <p className="text-sm text-blue-800">
                Agent Zero is showing improved processing efficiency for repeat vendor patterns.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="font-medium text-green-900">Automation Success</span>
              </div>
              <p className="text-sm text-green-800">
                {processedPercentage}% of invoices processed automatically with high confidence.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="font-medium text-amber-900">Optimization Opportunity</span>
              </div>
              <p className="text-sm text-amber-800">
                Complex scenarios could benefit from additional training data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm font-medium text-gray-500">Scenario</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Count</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Avg Time</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Avg Confidence</th>
                <th className="text-right py-2 text-sm font-medium text-gray-500">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processingMetrics.map((metric) => (
                <tr key={metric.scenario}>
                  <td className="py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SCENARIO_COLORS[metric.scenario as keyof typeof SCENARIO_COLORS] || '#6B7280' }}
                      />
                      <span className="font-medium capitalize">{metric.scenario.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-right font-medium">{metric.count}</td>
                  <td className="py-3 text-sm text-right">{metric.avgTime.toFixed(1)}s</td>
                  <td className="py-3 text-sm text-right">{metric.avgConfidence.toFixed(1)}%</td>
                  <td className="py-3 text-sm text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {(95 + Math.random() * 5).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}