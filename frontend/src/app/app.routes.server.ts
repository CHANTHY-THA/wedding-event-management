import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'invite/:token',
    renderMode: RenderMode.Server,
  },
  // The admin session lives in browser storage, so the server cannot tell who is signed in.
  // Render the login page and planner pages in the browser where the auth guard can see it.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
