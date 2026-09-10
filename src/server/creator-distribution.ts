/** Recompute fractions from the same disjoint bucket counts; legacy sources store percentages. */
export function distributionFractions<T extends { count: number; share: number }>(buckets: T[]): T[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return buckets.map(bucket => ({ ...bucket, share: total ? bucket.count / total : 0 }));
}

export function selectedTierMetrics(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null).sort((a,b) => a-b);
  if (!known.length) return {medianLikes:null,meanLikes:null,minLikes:null,maxLikes:null};
  const middle = Math.floor(known.length / 2);
  return {
    medianLikes: known.length % 2 ? known[middle]! : (known[middle-1]! + known[middle]!) / 2,
    meanLikes: known.reduce((sum,value) => sum+value,0) / known.length,
    minLikes: known[0]!, maxLikes:known.at(-1)!
  };
}
