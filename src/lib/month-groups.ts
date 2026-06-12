import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export type MonthGroup<T> = {
  /** z.B. "Januar 2026" */
  label: string;
  items: T[];
};

/**
 * Gruppiert eine (bereits nach Datum sortierte) Liste in Monatsblöcke
 * für die Log-Ansicht.
 */
export function groupByMonth<T>(items: T[], getDate: (item: T) => string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  let currentKey = '';

  for (const item of items) {
    const date = new Date(getDate(item));
    const key = format(date, 'yyyy-MM');
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ label: format(date, 'MMMM yyyy', { locale: de }), items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }

  return groups;
}
