// src/app/services/theme.services.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';

  currentTheme = signal<'light' | 'dark'>('light');

  constructor() {
    this.loadTheme();
  }

  loadTheme() {
    const saved = localStorage.getItem(this.storageKey) as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved ?? (prefersDark ? 'dark' : 'light');
    this.setTheme(theme);
  }

  toggleTheme() {
    const next = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: 'light' | 'dark') {
    this.currentTheme.set(theme);
    localStorage.setItem(this.storageKey, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
