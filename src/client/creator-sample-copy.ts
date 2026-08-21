/** Copy for the creator dossier's bounded comparison set.
 *
 * The canonical comparison capacity is 21 records, but a source corpus can
 * legitimately contain fewer public posts. Keep the capacity and the actual
 * count visible instead of presenting a short corpus as a complete set.
 */
export const COMPARISON_SET_CAPACITY = 21;

export function comparisonSetLabel(count: number, capacity = COMPARISON_SET_CAPACITY): string {
  return count === capacity
    ? `统一 ${capacity} 条内容库`
    : `统一内容库（最多 ${capacity} 条比较位，当前 ${count} 条）`;
}

export function comparisonSetNote(count: number, deepCount: number, capacity = COMPARISON_SET_CAPACITY): string {
  const setCopy = count === capacity ? `同一组 ${capacity} 条记录` : `同一组当前 ${count} 条记录（标准最多 ${capacity} 条比较位）`;
  return `List 与 Gallery 是${setCopy}；${deepCount} 条深度样本只作为证据等级标记。`;
}

export function deepSetNote(count: number, deepCount: number, capacity = COMPARISON_SET_CAPACITY): string {
  const setCopy = count === capacity ? `${capacity} 条统一选择集` : `当前 ${count} 条统一选择集（最多 ${capacity} 条比较位）`;
  return `深度样本仍属于上面的同一组${setCopy}；这里只汇总覆盖，不再复制一份 ${deepCount} 条展示。`;
}
