import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PageKey, canOpen, homePathFor } from './permissions';

/** Planner pages: send signed-out visitors to the login page, then back again. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Pages limited to some roles (set `data: { page: '<PageKey>' }` on the route).
 * Anyone else is sent to the first page their role may open.
 */
export const roleGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  const role = auth.role();
  const page = route.data['page'] as PageKey | undefined;
  if (!role || !page || canOpen(role, page)) {
    return true;
  }
  return router.parseUrl(homePathFor(role));
};

/** Login page: a user who is already signed in goes straight to their home page. */
export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureLoaded();
  const role = auth.role();
  return role ? router.parseUrl(homePathFor(role)) : true;
};
