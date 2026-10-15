import { describe, expect, it } from 'vitest';
import {
  CONTACT_CHANNELS,
  PUBLIC_NAV,
  SITE_FAQ,
  SITE_FEATURES,
  SITE_MODULES,
  SITE_PLANS,
} from './publicContent';

describe('public site content', () => {
  it('exposes the requested top-level navigation', () => {
    expect(PUBLIC_NAV.map((item) => item.label)).toEqual([
      'Home',
      'About',
      'Features',
      'Modules',
      'Plans',
      'FAQ',
      'Contact',
    ]);
  });

  it('links every nav item under the /site prefix with unique paths', () => {
    const paths = PUBLIC_NAV.map((item) => item.to);
    expect(paths.every((path) => path.startsWith('/site'))).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths[0]).toBe('/site');
  });

  it('gives every module a unique title and description', () => {
    const titles = SITE_MODULES.map((module) => module.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(SITE_MODULES.every((module) => module.description.length > 0)).toBe(true);
    expect(SITE_FEATURES.every((feature) => feature.description.length > 0)).toBe(true);
  });

  it('features at least one highlighted plan', () => {
    expect(SITE_PLANS.filter((plan) => plan.highlighted)).toHaveLength(1);
  });

  it('has well-formed FAQ entries', () => {
    expect(SITE_FAQ.length).toBeGreaterThan(3);
    expect(SITE_FAQ.every((item) => item.question.endsWith('?') && item.answer.length > 20)).toBe(
      true,
    );
  });

  it('provides contact channels with icons', () => {
    expect(CONTACT_CHANNELS.length).toBeGreaterThanOrEqual(3);
    expect(CONTACT_CHANNELS.every((channel) => channel.value.length > 0)).toBe(true);
  });
});
