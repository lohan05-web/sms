import type { UniversityDesignationCount, UniversityPerformancePoint } from '@smartschool/shared';
import { describe, expect, it } from 'vitest';
import {
  areaPath,
  conicGradient,
  designationColor,
  designationLegend,
  linePath,
  niceCeiling,
  performanceCeiling,
  performanceCoordinates,
  seriesCoordinates,
  sharePercentage,
} from './university';

function point(month: string, average: number): UniversityPerformancePoint {
  return { month, label: month, average, results: 10 };
}

function designation(
  name: string,
  count: number,
  percentage: number,
): UniversityDesignationCount {
  return { designation: name, label: name, count, percentage };
}

describe('designationColor', () => {
  it('returns a mapped colour for known designations', () => {
    expect(designationColor('PROFESSOR')).toBe('#14b8a6');
  });

  it('falls back to a default colour', () => {
    expect(designationColor('VISITING')).toBe('#0d9488');
  });
});

describe('conicGradient', () => {
  it('builds sequential stops from the shares', () => {
    const gradient = conicGradient([
      designation('PROFESSOR', 3, 60),
      designation('LECTURER', 2, 40),
    ]);
    expect(gradient).toContain('conic-gradient(from 180deg');
    expect(gradient).toContain('#14b8a6 0% 60%');
    expect(gradient).toContain('#0f766e 60% 100%');
  });

  it('fills the remaining arc when shares do not total 100', () => {
    const gradient = conicGradient([designation('PROFESSOR', 1, 25)]);
    expect(gradient).toContain('rgba(148, 163, 184, 0.14) 25% 100%');
  });

  it('skips zero-share designations', () => {
    const gradient = conicGradient([
      designation('PROFESSOR', 0, 0),
      designation('LECTURER', 1, 100),
    ]);
    expect(gradient).not.toContain('#14b8a6');
    expect(gradient).toContain('#0f766e 0% 100%');
  });
});

describe('performanceCeiling', () => {
  it('rounds the peak up to the next multiple of ten', () => {
    expect(performanceCeiling([point('Jan', 42), point('Feb', 68)])).toBe(70);
  });

  it('never goes below ten or above one hundred', () => {
    expect(performanceCeiling([])).toBe(10);
    expect(performanceCeiling([point('Jan', 0)])).toBe(10);
    expect(performanceCeiling([point('Jan', 120)])).toBe(100);
  });
});

describe('performanceCoordinates', () => {
  it('centres a single point', () => {
    expect(performanceCoordinates([point('Jan', 50)], 600, 200, 100)).toEqual([
      { x: 300, y: 100 },
    ]);
  });

  it('spreads points across the width and inverts the y axis', () => {
    const coords = performanceCoordinates(
      [point('Jan', 0), point('Feb', 50), point('Mar', 100)],
      600,
      200,
      100,
    );
    expect(coords).toEqual([
      { x: 0, y: 200 },
      { x: 300, y: 100 },
      { x: 600, y: 0 },
    ]);
  });

  it('clamps averages above the ceiling', () => {
    expect(performanceCoordinates([point('Jan', 150)], 600, 200, 100)[0]?.y).toBe(0);
  });
});

describe('niceCeiling', () => {
  it('rounds up to a clean magnitude', () => {
    expect(niceCeiling([3, 7])).toBe(10);
    expect(niceCeiling([42, 68])).toBe(100);
    expect(niceCeiling([210])).toBe(500);
    expect(niceCeiling([900, 1400])).toBe(2000);
    expect(niceCeiling([1])).toBe(1);
  });

  it('never returns zero', () => {
    expect(niceCeiling([])).toBe(1);
    expect(niceCeiling([0, 0])).toBe(1);
  });
});

describe('seriesCoordinates', () => {
  it('centres a single value', () => {
    expect(seriesCoordinates([5], 600, 200, 10)).toEqual([{ x: 300, y: 100 }]);
  });

  it('spreads and inverts a series', () => {
    expect(seriesCoordinates([0, 10], 600, 200, 10)).toEqual([
      { x: 0, y: 200 },
      { x: 600, y: 0 },
    ]);
  });

  it('clamps values above the ceiling', () => {
    expect(seriesCoordinates([99], 600, 200, 10)[0]?.y).toBe(0);
  });
});

describe('path builders', () => {
  it('creates a polyline path', () => {
    expect(linePath([{ x: 0, y: 200 }, { x: 300, y: 100 }])).toBe('M0 200 L300 100');
  });

  it('closes the area back to the baseline', () => {
    expect(areaPath([{ x: 0, y: 200 }, { x: 300, y: 100 }, { x: 600, y: 0 }], 200)).toBe(
      'M0 200 L300 100 L600 0 L600 200 L0 200 Z',
    );
  });

  it('returns an empty string when there are no points', () => {
    expect(linePath([])).toBe('');
    expect(areaPath([], 200)).toBe('');
  });
});

describe('sharePercentage', () => {
  it('rounds to one decimal place', () => {
    expect(sharePercentage(1, 3)).toBe(33.3);
    expect(sharePercentage(2, 4)).toBe(50);
  });

  it('guards against a zero total', () => {
    expect(sharePercentage(5, 0)).toBe(0);
  });
});

describe('designationLegend', () => {
  it('sorts by count and resolves a colour', () => {
    const legend = designationLegend([
      designation('LECTURER', 1, 20),
      designation('PROFESSOR', 4, 80),
    ]);
    expect(legend.map((item) => item.key)).toEqual(['PROFESSOR', 'LECTURER']);
    expect(legend[0]?.color).toBe('#14b8a6');
  });
});
