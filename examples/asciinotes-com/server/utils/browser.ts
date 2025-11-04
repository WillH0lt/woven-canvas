import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

async function browserSingleton(): Promise<Browser> {
  console.log('LAUNCHING BROWSER');
  return puppeteer.launch({
    headless: true,
    timeout: 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,630'],
  });
}

declare const globalThis: {
  browserGlobal: Promise<Browser>;
} & typeof global;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const browser = globalThis.browserGlobal ?? browserSingleton();

export default browser;

// if (process.env.NODE_ENV !== 'production') globalThis.browserGlobal = browser;
globalThis.browserGlobal = browser;
