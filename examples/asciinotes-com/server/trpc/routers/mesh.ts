import { z } from 'zod';

import { protectedProcedure, router } from '~/server/trpc/trpc.js';

interface MeshResponse {
  total: number;
  results: {
    ID: string;
    Title: string;
    Description: string;
    Attribution: string;
    Thumbnail: string;
    Download: string;
    'Tri Count': number;
    Creator: {
      ID: string;
      Name: string;
      Avatar: string;
      Profile: string;
    };
    Uploaded: string;
    Category: string;
    Tags: string[];
    Licence: string;
    Animated: boolean;
    Orbit?: {
      X: number;
      Y: number;
      Z: number;
      Radius: number;
      Speed: number;
    };
  }[];
}

const meshRouter = router({
  get: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        limit: z.number(),
        page: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const params = new URLSearchParams({
        license: '1',
        limit: input.limit.toString(),
        page: input.page.toString(),
      });

      const response = await fetch(
        `https://api.poly.pizza/v1.1/search/${input.search}?${params.toString()}`,
        {
          headers: {
            'x-auth-token': 'eacd793bc49c456bb78ac8792ae0bfeb',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data from Poly API');
      }
      const data = (await response.json()) as MeshResponse;

      return data.results.map((result) => ({
        id: result.ID,
        thumbnail: result.Thumbnail,
        download: result.Download,
      }));
    }),
});

export default meshRouter;
