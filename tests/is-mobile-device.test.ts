import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMobileDevice } from '../src/coordinate-utils';

const ORIG_UA = navigator.userAgent;
const ORIG_WIDTH = window.innerWidth;

function setUserAgent(ua: string): void {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

function setWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
}

describe('isMobileDevice', () => {
  beforeEach(() => {
    setWidth(1920);
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15');
  });

  afterEach(() => {
    setUserAgent(ORIG_UA);
    setWidth(ORIG_WIDTH);
  });

  it('returns false for a wide-viewport desktop browser', () => {
    expect(isMobileDevice()).toBe(false);
  });

  it('returns true for the Home Assistant Companion app', () => {
    setUserAgent('Mozilla/5.0 (Linux) Home Assistant/2026.4.0');
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true at the 768 px viewport boundary', () => {
    setWidth(768);
    expect(isMobileDevice()).toBe(true);
  });

  it('returns false just above 768 px', () => {
    setWidth(769);
    expect(isMobileDevice()).toBe(false);
  });

  it('returns true for an iPhone user agent', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an Android user agent', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)');
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an iPad user agent', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
    expect(isMobileDevice()).toBe(true);
  });

  it('UA match wins even on a wide viewport', () => {
    setWidth(2560);
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Tablet)');
    expect(isMobileDevice()).toBe(true);
  });
});
