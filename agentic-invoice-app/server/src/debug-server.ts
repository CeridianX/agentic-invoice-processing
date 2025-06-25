import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Test endpoints
app.get('/', (req, res) => {
  res.send('Server is working!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    message: 'Debug server is running'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    endpoints: [
      '/health',
      '/api/test',
      '/api/agents/agent-zero/status'
    ]
  });
});

// Mock Agent Zero status
app.get('/api/agents/agent-zero/status', (req, res) => {
  res.json({
    status: 'running',
    initialized: true,
    activeAgents: 4,
    activePlans: 0,
    agentStatuses: {
      CoordinatorAgent: { status: 'idle' },
      DocumentProcessorAgent: { status: 'idle' },
      ValidationAgent: { status: 'idle' },
      WorkflowAgent: { status: 'idle' }
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start server with explicit error handling
const PORT = 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Debug server is running on http://${HOST}:${PORT}`);
  console.log(`Test these URLs:`);
  console.log(`  http://localhost:${PORT}/`);
  console.log(`  http://localhost:${PORT}/health`);
  console.log(`  http://localhost:${PORT}/api/test`);
}).on('error', (err: any) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
  }
});