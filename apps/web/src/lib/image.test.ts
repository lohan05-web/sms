import { describe, expect, it } from 'vitest';
import { fitWithin, isImageType } from './image';

describe('fitWithin', () => {
  it('leaves images that already fit untouched', () => {
    expect(fitWithin(100, 80, 256)).toEqual({ width: 100, height: 80 });
  });

  it('scales landscape images down to the max dimension', () => {
    expect(fitWithin(1024, 512, 256)).toEqual({ width: 256, height: 128 });
  });

  it('scales portrait images down to the max dimension', () => {
    expect(fitWithin(400, 800, 200)).toEqual({ width: 100, height: 200 });
  });

  it('never returns a zero dimension', () => {
    expect(fitWithin(0, 0, 256)).toEqual({ width: 1, height: 1 });
  });
});

describe('isImageType', () => {
  it('accepts image mime types', () => {
    expect(isImageType('image/png')).toBe(true);
    expect(isImageType('image/jpeg')).toBe(true);
  });

  it('rejects non-image mime types', () => {
    expect(isImageType('application/pdf')).toBe(false);
    expect(isImageType('text/plain')).toBe(false);
  });
});
