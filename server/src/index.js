/**
 * CivicPulse — Express entry point.
 *
 * Wires up all global middleware, mounts module routers, and starts the server.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const { verifyToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  /* ── Global middleware ── */
  app.use(helmet());
  app.use(cors(config.cors));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  /* ── Health check ── */
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.use('/api', verifyToken); // populate req.user only for API requests

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.resolve(config.uploads.dir)));

  /* ── Module routes ── */
  app.use('/api/auth', require('./modules/auth/auth.routes'));

  // Phase 2 modules
  app.use('/api/universities', require('./modules/universities/uni.routes'));
  app.use('/api/leaders', require('./modules/leaders/leader.routes'));
  app.use('/api/teams', require('./modules/teams/team.routes'));
  app.use('/api', require('./modules/evidence/evidence.routes'));
  app.use('/api/domains', require('./modules/domains/domain.routes'));

  // Phase 3: citizen reports, duplicate decisions and the shared problem feed.
  app.use('/api/reports', require('./modules/reports/report.routes'));
  app.use('/api/problems', require('./modules/problems/problem.routes'));
  app.use('/api/applications', require('./modules/applications/application.routes'));
  app.use('/api/admin/phase4', require('./modules/admin/phase4.routes'));
  // Phase 5: project execution, completion sign-off and certificates.
  app.use('/api/projects', require('./modules/projects/project.routes'));
  // Phase 6: AI-assisted domain classification and difficulty prediction.
  app.use('/api/ai', require('./modules/ai/ai.routes'));

  // Future phase routes will be mounted here:
  // app.use('/api/applications', require('./modules/applications/app.routes'));
  // app.use('/api/sponsorships', require('./modules/sponsorships/sponsor.routes'));
  // app.use('/api/companies',    require('./modules/companies/company.routes'));
  // app.use('/api/certificates', require('./modules/certificates/cert.routes'));
  // app.use('/api/notifications',require('./modules/notifications/notif.routes'));
  // app.use('/api/flags',        require('./modules/flags/flag.routes'));
  // app.use('/api/admin',        require('./modules/admin/admin.routes'));

  /* ── 404 catch-all ── */
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });

  /* ── Central error handler (must be last) ── */
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  config.validateRuntime();
  const app = createApp();
  const server = app.listen(config.server.port, () => {
    console.log(`[CivicPulse] Server running on http://localhost:${config.server.port} (${config.server.env})`);
  });
  // Retry-safe lifecycle worker. PostgreSQL advisory locks make concurrent
  // workers across multiple server instances safe.
  const phase4Jobs = require('./modules/applications/application.logic');
  const lifecycleTimer = setInterval(() => {
    phase4Jobs.runLifecycleJobs().catch((err) => {
      console.error('[CivicPulse] Phase 4 lifecycle job failed:', err.message);
    });
  }, 60 * 1000);
  lifecycleTimer.unref();
  phase4Jobs.runLifecycleJobs().catch((err) => {
    console.error('[CivicPulse] Initial Phase 4 lifecycle job failed:', err.message);
  });

  // Phase 6: AI asynchronous background job runner
  const aiWorker = require('./modules/ai/ai.worker');
  const aiTimer = setInterval(() => {
    aiWorker.runAIWorker({ batchSize: 5 }).catch((err) => {
      console.error('[CivicPulse] AI worker background job failed:', err.message);
    });
  }, 30 * 1000);
  aiTimer.unref();
  aiWorker.runAIWorker({ batchSize: 5 }).catch((err) => {
    console.error('[CivicPulse] Initial AI worker job run failed:', err.message);
  });

  const pool = require('./db/pool');
  const shutdown = (signal) => {
    console.log(`[CivicPulse] ${signal} received; shutting down`);
    clearInterval(lifecycleTimer);
    clearInterval(aiTimer);
    server.close(async () => {
      try {
        await pool.end();
      } catch (err) {
        console.error('[CivicPulse] Error while closing database pool:', err.message);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { createApp };
