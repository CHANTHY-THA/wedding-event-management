import { Routes } from '@angular/router';
import { Invitation } from './invitation';

export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'invite/:token', component: Invitation },
];
