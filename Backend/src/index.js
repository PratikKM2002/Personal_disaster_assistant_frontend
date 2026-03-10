const { ENV } = require('./config/env');
const { createServer } = require('./server');
const { startScheduler } = require('./jobs/scheduler');

const server = createServer();

server.listen(ENV.port, '0.0.0.0', () => {
  console.log(`HTTP server running on :${ENV.port}`);

  // Don't run background jobs during tests / CI
  if (process.env.DISABLE_SCHEDULER !== 'true') {
    startScheduler();
  }
});


// const { ENV } = require('./config/env');
// const { createServer } = require('./server');
// const { startScheduler } = require('./jobs/scheduler');

// const server = createServer();
// server.listen(ENV.port, '0.0.0.0', () => {
//     console.log(`HTTP server running on :${ENV.port}`);
//     startScheduler(); // Starts backend jobs
// });