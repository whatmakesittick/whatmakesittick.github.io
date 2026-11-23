import type { FigureData } from './data';

export interface TestBody {
  readonly name: string;
  readonly loadData: () => Promise<FigureData>;
  readonly vertexCount: number;
  readonly strokeTruth: URL;
  readonly groundTruth?: URL;
  readonly samples: URL;
}

const FIXTURES = new URL('./fixtures/', import.meta.url);

export const TEST_BODIES: readonly TestBody[] = [
  {
    name: 'swimmer',
    loadData: async () =>
      (
        await import('../../../explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data')
      ).athleteData,
    vertexCount: 4899,
    strokeTruth: FIXTURES,
    groundTruth: FIXTURES,
    samples: FIXTURES,
  },
];
