import type { Work } from '@/types/database';
import type { ReportFilters } from './types';

export function applyReportFilters(works: Work[], filters: ReportFilters): Work[] {
  return works.filter((work) => {
    // 1. Search Query Filter
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const matchName = work.work_name?.toLowerCase().includes(q);
      const matchUBQN = work.ubqn?.toLowerCase().includes(q);
      const matchClient = work.client_name?.toLowerCase().includes(q);
      if (!matchName && !matchUBQN && !matchClient) {
        return false;
      }
    }

    // 2. Status Filter
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes('All')) {
        const matchesStatus = filters.statuses.some((st) => {
          if (st === 'Running R1 + R2') {
            return work.status === 'Running R1' || work.status === 'Running R2';
          }
          if (st === 'Completed') {
            return work.status?.startsWith('Completed');
          }
          return work.status === st;
        });
        if (!matchesStatus) return false;
      }
    } else if (filters.status && filters.status !== 'All') {
      if (filters.status === 'Running R1 + R2') {
        if (work.status !== 'Running R1' && work.status !== 'Running R2') {
          return false;
        }
      } else if (filters.status === 'Completed') {
        if (!work.status?.startsWith('Completed')) {
          return false;
        }
      } else if (work.status !== filters.status) {
        return false;
      }
    }

    // 3. Subcategory (Work Type) Filter
    if (filters.subcategory !== 'All') {
      if (filters.subcategory === 'Road') {
        const isRoad = work.subcategory === 'Road' || 
          (work.division?.code === 'RnB' && work.subcategory !== 'Bridge');
        if (!isRoad) return false;
      } else if (filters.subcategory === 'Bridge') {
        const isBridge = work.subcategory === 'Bridge';
        if (!isBridge) return false;
      } else if (filters.subcategory === 'Arch') {
        const isArch = work.division?.code === 'BTP' || work.division?.name?.includes('Buildings') || work.subcategory === 'Arch';
        if (!isArch) return false;
      } else if (filters.subcategory === 'Ens') {
        const isEns = work.division?.code === 'EnS' || work.division?.name?.includes('Environment') || work.subcategory === 'Ens';
        if (!isEns) return false;
      }
    }

    return true;
  });
}
