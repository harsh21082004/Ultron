import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { NgZone } from '@angular/core';
import 'zone.js'; 

bootstrapApplication(App, appConfig)
  .then((ref) => {
    const zone = ref.injector.get(NgZone);

  })
  .catch((err) => console.error(err));
