import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { DARK_CLASS } from './core/theme.service';
import { SweetHomePreset } from './theme/sweet-home-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      theme: { preset: SweetHomePreset, options: { darkModeSelector: `.${DARK_CLASS}` } },
    }),
  ],
};
