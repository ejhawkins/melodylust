import { describe, expect, it } from 'vitest';
import { articleItems } from './article-items';

const gwen = "Gwen Stefani marks 25 years of No Doubt's feminist anthem 'Just a Girl' by recreating her iconic 1995 music video fashion look—featuring a cropped red-and-blue striped tank top, baggy blue track pants, pompadour ponytail, and signature red lipstick.";

describe('garments an article describes', () => {
  it('finds the outfit in the Gwen Stefani summary, in reading order, with its descriptive word', () => {
    expect(articleItems(gwen)).toEqual(['striped tank top', 'blue track pants']);
  });

  it('prefers the longest item and keeps one entry per item', () => {
    expect(articleItems('A plaid skirt, a vintage band tee and combat boots; later, combat boots again.')).toEqual(['plaid skirt', 'vintage band tee', 'combat boots']);
  });

  it('only uses words that are in the text, and stops at the limit', () => {
    expect(articleItems('An Off-White biker suit encrusted with crystals, with roller skates, a pendant and a cape.', 2)).toEqual(['suit', 'roller skates']);
    expect(articleItems('Hosting an after-party in Times Square.')).toEqual([]);
    expect(articleItems(undefined)).toEqual([]);
  });

  it('does not match items inside other words', () => {
    expect(articleItems('A coathanger, a suitcase and a hatband.')).toEqual([]);
  });
});
