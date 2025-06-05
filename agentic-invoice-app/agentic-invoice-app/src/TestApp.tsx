export default function TestApp() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice Processing</h1>
        <p className="text-gray-600 mb-6">AI-powered accounts payable with intelligent line-item matching</p>
        
        {/* Test card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Card</h2>
          <p className="text-gray-600">If you can see this, the basic styling is working!</p>
        </div>
      </div>
    </div>
  );
}