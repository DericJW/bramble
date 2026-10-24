/**
 * One shared ticking clock for every pixel animation in the app.
 *
 * Instead of hundreds of timers, animated pieces subscribe here and read the current time.
 * It ticks ten times a second, only while something is listening, and stops while the app
 * is in the background.
 */
import { AppState, type AppStateStatus } from 'react-native';

const TICK_MS = 100;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
let appActive = true;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function start() {
  if (timer || !appActive || listeners.size === 0) return;
  now = Date.now();
  timer = setInterval(tick, TICK_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

AppState.addEventListener('change', (state: AppStateStatus) => {
  appActive = state === 'active';
  if (appActive) start();
  else stop();
});

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function clockNow(): number {
  return now;
}

/** For the motionless case: subscribing to nothing. */
export function subscribeNever(): () => void {
  return () => undefined;
}
