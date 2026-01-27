import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Verificăm dacă avem user salvat în localStorage (dacă e logat)
  // Notă: E nevoie de check pentru browser (SSR safety) dacă folosești SSR, 
  // dar pentru simplitate presupunem că rulează în browser.
  const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null;

  if (userId) {
    return true; // E logat, îl lăsăm să treacă
    } else {
    // Nu e logat, îl trimitem la Login
    router.navigate(['/login']);
    return false;
  }
};