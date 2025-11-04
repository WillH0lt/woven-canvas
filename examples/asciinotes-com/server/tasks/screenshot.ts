import type { Page } from '@prisma/client';
import { getStorage } from 'firebase-admin/storage';
import type { Browser } from 'puppeteer';

import browserPromise from '~/server/utils/browser.js';
import { firebaseApp } from '~/server/utils/firebase.js';

import prisma from '~/server/trpc/db.js';

interface ScreenshotPayload {
  page: Page;
  session: string;
}

async function takeScreenshot(browser: Browser, url: string, session: string): Promise<Uint8Array> {
  const domain = new URL(url).host;

  const page = await browser.newPage();

  await page.setCookie({
    name: '__session',
    value: session,
    domain,
  });

  await page.setJavaScriptEnabled(false);

  await page.setViewport({
    width: 1200,
    height: 630,
  });

  await page.goto(url);

  const buffer = await page.screenshot({
    fullPage: true,
  });

  await page.close();

  return buffer;
}

export default defineTask({
  meta: {
    name: 'screenshot',
    description: 'Take screenshots of page',
  },
  async run({ payload }) {
    const { page, session } = payload as unknown as ScreenshotPayload;

    const runtimeConfig = useRuntimeConfig();
    const storage = getStorage(firebaseApp);
    const bucket = storage.bucket(runtimeConfig.previewsBucket);

    const browser = await browserPromise;

    // take screenshot
    const url = `http://localhost:3000/preview/${page.siteId}/${page.path}`;
    const buffer = await takeScreenshot(browser, url, session);

    // upload to firebase
    const file = bucket.file(`${page.id}.png`);
    await file.save(buffer, {
      contentType: 'image/png',
    });

    const publicUrl = await file.getMetadata().then((metadata) => metadata[0].mediaLink);

    // save to database
    await prisma.page.update({
      where: {
        id: page.id,
      },
      data: {
        previewImage: publicUrl,
      },
    });

    return { result: 'Success' };
  },
});
