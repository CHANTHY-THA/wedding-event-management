import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Pass `/api` requests through to the backend (`backend/`), so the browser talks to one site and
 * the session cookie stays first-party. `API_URL` is the backend's address, e.g.
 * http://localhost:3000. (During `ng serve`, proxy.conf.json does the same.)
 */
const apiUrl = process.env['API_URL'];
if (apiUrl) {
  app.use('/api', (req, res) => {
    const target = new URL(req.originalUrl, apiUrl);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = send(
      target,
      {
        method: req.method,
        headers: { ...req.headers, host: target.host, 'x-forwarded-for': req.ip },
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'The server is not reachable right now.' });
      }
    });
    req.pipe(upstream);
  });
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
