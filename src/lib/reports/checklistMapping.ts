export const CHECKLIST_REPORT_MAPPING: Record<string, Record<string, number | null>> = {
  Road: {
    survey: 1,
    geology: 6,
    geotech: null, // N/A
    hydrology: null, // N/A
    gad: null, // N/A
    ppr: null, // N/A
    vetting: null, // N/A
    estimate: 11,
    formatting: 12,
    dpr: 13,
  },
  Bridge: {
    survey: 1,
    geology: 4,
    geotech: 6,
    hydrology: 7,
    gad: 8,
    ppr: 9,
    vetting: 11,
    estimate: 12,
    formatting: 13,
    dpr: 14,
  },
  Arch: {
    survey: 2,
    geology: 4,
    geotech: 6,
    hydrology: null, // N/A
    gad: null, // N/A
    ppr: null, // N/A
    vetting: 8,
    estimate: 9,
    formatting: 10,
    dpr: 11,
  },
  Ens: {
    survey: 5,
    geology: null,
    geotech: null,
    hydrology: null,
    gad: null,
    ppr: null,
    vetting: null,
    estimate: null,
    formatting: null,
    dpr: 12, // Report / Printing
  }
};
