import { expect, it } from 'vitest';
import { distributionFractions } from './creator-distribution.js';
it('converts a legacy percent distribution into exact fractions without changing counts', () => {
  const result = distributionFractions([{label:'a',count:3,share:4.8},{label:'b',count:59,share:95.2}]);
  expect(result[0]).toEqual({label:'a',count:3,share:3/62});
  expect(result.reduce((sum,b)=>sum+b.share,0)).toBe(1);
});
it('keeps empty measured distributions finite', () => {
  expect(distributionFractions([{count:0,share:0}])).toEqual([{count:0,share:0}]);
});

import { selectedTierMetrics } from './creator-distribution.js';
it('computes selected-tier metrics from known counts and keeps missing measurements unknown', () => {
  expect(selectedTierMetrics([10,null,30])).toEqual({medianLikes:20,meanLikes:20,minLikes:10,maxLikes:30});
  expect(selectedTierMetrics([null])).toEqual({medianLikes:null,meanLikes:null,minLikes:null,maxLikes:null});
});
