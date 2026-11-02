(function(){
  "use strict";

  // Curated GTA zoning matrix. Each use lists a row per major industrial municipality.
  // status: 'yes' (permitted as-of-right), 'variance' (requires minor variance or SPA),
  //          'no' (prohibited or separate designation required).
  // zones: the specific zoning categories in that municipality.
  // bylaw: link to the municipality's consolidated zoning by-law (source of truth at lookup time).
  var MUNI = {
    toronto:     { name: 'Toronto (City)',          bylaw: 'https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/' },
    mississauga: { name: 'Mississauga',             bylaw: 'https://www.mississauga.ca/services-and-programs/building-and-renovating/zoning-by-law/' },
    brampton:    { name: 'Brampton',                bylaw: 'https://www.brampton.ca/EN/Business/planning-development/zoning/Pages/zoning-by-law.aspx' },
    vaughan:     { name: 'Vaughan',                 bylaw: 'https://www.vaughan.ca/business/development-planning/zoning-by-law' },
    markham:     { name: 'Markham',                 bylaw: 'https://www.markham.ca/wps/portal/home/business/planning-and-development/zoning-by-laws' },
    oakville:    { name: 'Oakville',                bylaw: 'https://www.oakville.ca/business-development/planning-applications/zoning-by-law/' },
    burlington:  { name: 'Burlington',              bylaw: 'https://www.burlington.ca/en/services-for-you/zoning-by-law.aspx' },
    milton:      { name: 'Milton',                  bylaw: 'https://www.milton.ca/en/business-development/zoning.aspx' },
    pickering:   { name: 'Pickering',               bylaw: 'https://www.pickering.ca/en/city-hall/zoning-by-law.aspx' },
    ajax:        { name: 'Ajax',                    bylaw: 'https://www.ajax.ca/en/business-and-growth/zoning-by-law.aspx' },
    whitby:      { name: 'Whitby',                  bylaw: 'https://www.whitby.ca/en/work/zoning-by-law.aspx' },
    oshawa:      { name: 'Oshawa',                  bylaw: 'https://www.oshawa.ca/en/business-development/zoning-by-laws.aspx' }
  };

  // Data: use -> per-municipality ruling
  var DATA = {
    'light-manufacturing': {
      title: 'Light manufacturing / assembly',
      summary: 'Assembly, machining, light fabrication, packaging. The bread-and-butter industrial use — permitted in nearly every industrial zone across the GTA.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0, EH1.0',      notes: 'Permitted in Employment Industrial and Employment Light Industrial zones.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'All standard Employment zones permit.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2, M3',               notes: 'Light industrial permitted in all M-series zones.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'All Employment zones permit light manufacturing.' },
        markham:     { status: 'yes',      zones: 'MB, MC, MJ (by-law 2024-19)',   notes: 'Business Corridor and General Employment permit.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3, E4',                notes: 'Permitted across all Employment zones.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2, BC, PE',              notes: 'General Employment, Business Corridor, Prestige Employment.' },
        milton:      { status: 'yes',      zones: 'M1, M2, M3, M4',                notes: 'All industrial zones permit.' },
        pickering:   { status: 'yes',      zones: 'M1, M2, M2-I, M3',              notes: 'Industrial zones permit.' },
        ajax:        { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Standard industrial permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Light and general industrial.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B, GI, I',             notes: 'Select and General Industrial.' }
      }
    },
    'heavy-manufacturing': {
      title: 'Heavy manufacturing / fabrication',
      summary: 'Forging, metal casting, heavy fabrication, large press operations. Typically separated from prestige employment areas due to noise, vibration, and emissions.',
      rows: {
        toronto:     { status: 'variance', zones: 'EH1.0 (Employment Heavy)',      notes: 'Only Heavy Employment permits; most employment lands are Light.' },
        mississauga: { status: 'yes',      zones: 'E3 (General Industrial)',       notes: 'Permitted in E3; prohibited in E1/E2 prestige zones.' },
        brampton:    { status: 'yes',      zones: 'M2, M3',                        notes: 'M2/M3 permit; M1/M1A do not.' },
        vaughan:     { status: 'variance', zones: 'EM3 (General Employment)',      notes: 'Only EM3; not permitted in prestige EM1/EM2.' },
        markham:     { status: 'no',       zones: '—',                             notes: 'Markham has phased out heavy industrial designations.' },
        oakville:    { status: 'variance', zones: 'E3, E4',                        notes: 'Subject to emissions and setback review.' },
        burlington:  { status: 'yes',      zones: 'GE2',                           notes: 'General Employment 2 permits heavy uses.' },
        milton:      { status: 'yes',      zones: 'M3, M4',                        notes: 'Heavy and extractive industrial zones.' },
        pickering:   { status: 'yes',      zones: 'M2, M3',                        notes: 'General and heavy industrial.' },
        ajax:        { status: 'variance', zones: 'M3',                            notes: 'SPA plus separation distance study.' },
        whitby:      { status: 'yes',      zones: 'M3 (Heavy Industrial)',         notes: 'Limited M3 lands near 401.' },
        oshawa:      { status: 'yes',      zones: 'GI (General Industrial)',       notes: 'Permitted in GI; separation from residential required.' }
      }
    },
    'food-processing': {
      title: 'Food processing / commissary kitchen',
      summary: 'CFIA / MOH-governed food production. Often needs Type 2 or 3 exhaust, enhanced drainage, and proximity to labour and arterial trucking.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0',             notes: 'Food manufacturing permitted; check grease interceptor and odour control.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted; Peel Region sewer-use by-law applies.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2',                   notes: 'Food processing a core Brampton industry.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'Permitted across all employment zones.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Permitted; commissary kitchens also allowed.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted; Halton Region enhanced effluent rules.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2, BC',                  notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted; also in employment park.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B, GI',                notes: 'Permitted in all industrial zones.' }
      }
    },
    'cannabis': {
      title: 'Cannabis production / processing',
      summary: 'Licensed cannabis cultivation, processing, and packaging (Health Canada). Heavily regulated — most municipalities restrict to select industrial zones and impose setbacks from sensitive uses.',
      rows: {
        toronto:     { status: 'variance', zones: 'EH1.0 only',                    notes: 'Site-specific amendment typical; 150m setback from sensitive uses.' },
        mississauga: { status: 'variance', zones: 'E2, E3 (SPA required)',         notes: '300m setback from schools, daycares, residential.' },
        brampton:    { status: 'variance', zones: 'M2, M3 (SPA)',                  notes: '150m+ setback; odour control plan required.' },
        vaughan:     { status: 'variance', zones: 'EM3 (SPA + ZBA)',               notes: 'Site-specific approval; 300m setback.' },
        markham:     { status: 'no',       zones: '—',                             notes: 'Council prohibits as of 2020 interim control.' },
        oakville:    { status: 'variance', zones: 'E3, E4',                        notes: 'Site plan and odour mitigation; setback 150m.' },
        burlington:  { status: 'variance', zones: 'GE2',                           notes: '300m setback from residential and sensitive uses.' },
        milton:      { status: 'variance', zones: 'M3',                            notes: '300m setback; SPA required.' },
        pickering:   { status: 'variance', zones: 'M2, M3',                        notes: '150m setback.' },
        ajax:        { status: 'variance', zones: 'M3',                            notes: '300m setback from sensitive uses.' },
        whitby:      { status: 'variance', zones: 'M3',                            notes: 'Interim control; verify current status.' },
        oshawa:      { status: 'variance', zones: 'GI',                            notes: 'Site-specific amendment.' }
      }
    },
    'warehouse': {
      title: 'Warehouse &amp; distribution',
      summary: 'Bulk storage and distribution. Permitted almost universally in industrial zones; larger sites may trigger Class 4 noise study for 24/7 operations.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0, EH1.0',      notes: 'Permitted; 24/7 ops may need noise study.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted across Employment.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2, M3',               notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'Permitted.' },
        markham:     { status: 'yes',      zones: 'MB, MC, MJ',                    notes: 'Permitted.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3, E4',                notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2, BC, PE',              notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M1, M2, M3, M4',                notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B, GI, I',             notes: 'Permitted.' }
      }
    },
    'last-mile': {
      title: 'Last-mile logistics / courier depot',
      summary: 'Parcel cross-dock with high van/truck churn. Permitted in most industrial zones but traffic-impact and stacking-lane rules apply at larger sites.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0',                    notes: 'Permitted; TIA for sites over 4,500 m².' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted; truck routes restricted to arterials.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2',                   notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Permitted; noise at residential interface monitored.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Permitted.' },
        oakville:    { status: 'variance', zones: 'E2, E3',                        notes: 'TIA required if over 100 peak-hour movements.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2',                      notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'cold-storage': {
      title: 'Cold storage / refrigerated warehouse',
      summary: 'Permitted like warehouse but with higher power, roof-load, and ammonia refrigerant considerations; some municipalities require TSSA approval for large systems.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0, EH1.0',      notes: 'Permitted; TSSA required for ammonia systems.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        brampton:    { status: 'yes',      zones: 'M1, M2, M3',                    notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'Permitted.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Permitted.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2',                      notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted; power capacity often limiting.' },
        pickering:   { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'self-storage': {
      title: 'Self-storage facility',
      summary: 'Mini-storage / personal storage. Often restricted in prestige employment zones to protect employment density; generally permitted in secondary industrial lands.',
      rows: {
        toronto:     { status: 'variance', zones: 'EL2.0, E1.0 site-specific',     notes: 'Not permitted in prestige E2; site-specific amendment common.' },
        mississauga: { status: 'variance', zones: 'E3 (SPA)',                      notes: 'Policy disfavours in core employment lands; SPA required.' },
        brampton:    { status: 'yes',      zones: 'M1A, M2',                       notes: 'Permitted.' },
        vaughan:     { status: 'variance', zones: 'EM3',                           notes: 'Not in prestige zones; site-specific.' },
        markham:     { status: 'variance', zones: 'MC (site-specific)',            notes: 'Council rarely supports in employment lands.' },
        oakville:    { status: 'variance', zones: 'E3',                            notes: 'Permitted in some sub-areas only.' },
        burlington:  { status: 'variance', zones: 'GE2',                           notes: 'Not in Prestige Employment.' },
        milton:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'outdoor-storage': {
      title: 'Outdoor / trailer storage',
      summary: 'Uncovered storage of materials, equipment, or trailers. Typically requires screening (berms/fencing) and limited to a percentage of the lot.',
      rows: {
        toronto:     { status: 'variance', zones: 'EH1.0 with SPA',                notes: 'Limited to 25% of lot and screened; SPA required.' },
        mississauga: { status: 'variance', zones: 'E3 (outdoor as accessory)',     notes: 'Must be accessory to a principal use; opaque fencing.' },
        brampton:    { status: 'variance', zones: 'M2, M3',                        notes: 'Screening and setback from ROW required.' },
        vaughan:     { status: 'variance', zones: 'EM3',                           notes: 'Accessory only; not in prestige EM1/EM2.' },
        markham:     { status: 'no',       zones: '—',                             notes: 'Generally prohibited outside of General Employment pockets.' },
        oakville:    { status: 'variance', zones: 'E3, E4',                        notes: 'Accessory only; screening required.' },
        burlington:  { status: 'variance', zones: 'GE2',                           notes: 'Accessory to principal use; screening.' },
        milton:      { status: 'yes',      zones: 'M3, M4',                        notes: 'Permitted in heavy/extractive zones.' },
        pickering:   { status: 'variance', zones: 'M2, M3',                        notes: 'Must be accessory; screening.' },
        ajax:        { status: 'variance', zones: 'M2, M3',                        notes: 'Accessory; screening.' },
        whitby:      { status: 'variance', zones: 'M2, M3',                        notes: 'Screening and setback required.' },
        oshawa:      { status: 'yes',      zones: 'GI, I',                         notes: 'Permitted; screening required.' }
      }
    },
    'auto-service': {
      title: 'Auto service / repair garage',
      summary: 'Mechanical repair, oil change, tire installation. Often separated from retail commercial corridors; many industrial zones permit as-of-right.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0',                    notes: 'Permitted; not in prestige EL1.0 office.' },
        mississauga: { status: 'yes',      zones: 'E2, E3',                        notes: 'Permitted; not in prestige E1.' },
        brampton:    { status: 'yes',      zones: 'M1A, M2',                       notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Permitted; not in prestige EM1.' },
        markham:     { status: 'yes',      zones: 'MC, MJ',                        notes: 'Permitted.' },
        oakville:    { status: 'yes',      zones: 'E2, E3',                        notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2',                      notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-B, GI',                      notes: 'Permitted.' }
      }
    },
    'auto-body': {
      title: 'Auto body / paint shop',
      summary: 'Collision repair including spray painting. MECP Environmental Compliance Approval typically required for paint booth emissions.',
      rows: {
        toronto:     { status: 'variance', zones: 'EH1.0 preferred',               notes: 'ECA required; not permitted in EL zones.' },
        mississauga: { status: 'yes',      zones: 'E3',                            notes: 'Permitted; ECA required.' },
        brampton:    { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        vaughan:     { status: 'variance', zones: 'EM3',                           notes: 'Site-specific; ECA and odour control plan.' },
        markham:     { status: 'variance', zones: 'MJ',                            notes: 'Permitted in general employment only; ECA required.' },
        oakville:    { status: 'yes',      zones: 'E3, E4',                        notes: 'Permitted; ECA.' },
        burlington:  { status: 'yes',      zones: 'GE2',                           notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M3',                            notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M3',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M3',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'contractor': {
      title: "Contractor's yard / tradesman shop",
      summary: 'Electrician, HVAC, plumbing, landscaper, general contractor. Shop + some outdoor storage of materials and service vehicles.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0',                    notes: 'Permitted.' },
        mississauga: { status: 'yes',      zones: 'E2, E3',                        notes: 'Permitted; outdoor storage accessory only.' },
        brampton:    { status: 'yes',      zones: 'M1A, M2',                       notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Permitted.' },
        markham:     { status: 'yes',      zones: 'MC, MJ',                        notes: 'Permitted.' },
        oakville:    { status: 'yes',      zones: 'E2, E3',                        notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2',                      notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'vehicle-rental': {
      title: 'Vehicle rental / fleet ops',
      summary: 'Car, truck, or equipment rental with on-site storage. Screening and access-point rules apply.',
      rows: {
        toronto:     { status: 'variance', zones: 'E1.0 site-specific',            notes: 'Usually a site-specific amendment.' },
        mississauga: { status: 'yes',      zones: 'E2, E3',                        notes: 'Permitted.' },
        brampton:    { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Permitted.' },
        markham:     { status: 'variance', zones: 'MC',                            notes: 'Site-specific.' },
        oakville:    { status: 'yes',      zones: 'E3',                            notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE2',                           notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M2, M3',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'GI',                            notes: 'Permitted.' }
      }
    },
    'research': {
      title: 'Research &amp; development / lab',
      summary: 'R&amp;D, prototyping, non-production labs. Welcomed in prestige employment as it drives higher employment density.',
      rows: {
        toronto:     { status: 'yes',      zones: 'EL1.0, E1.0, E2.0',             notes: 'Permitted; actively encouraged in prestige.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2',                   notes: 'Permitted; includes prestige areas.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'Permitted.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Permitted; prestige Markham preferred.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'BC, PE, GE1',                   notes: 'Permitted; Business Corridor preferred.' },
        milton:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B',                    notes: 'Permitted.' }
      }
    },
    'office-industrial': {
      title: 'Ancillary office within industrial',
      summary: 'Office space accessory to the principal industrial use. Most by-laws cap the office component at 25–50% of GFA.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0',             notes: 'Ancillary office permitted; stand-alone office often restricted.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Ancillary office capped at ~25% of GFA.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2',                   notes: 'Accessory office permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM1, EM2, EM3',                 notes: 'Accessory office permitted.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Accessory office permitted; cap at 50%.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Accessory office permitted.' },
        burlington:  { status: 'yes',      zones: 'BC, PE, GE1, GE2',              notes: 'Accessory office; stand-alone only in BC.' },
        milton:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Accessory office permitted.' },
        pickering:   { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B, GI',                notes: 'Permitted.' }
      }
    },
    'showroom': {
      title: 'Showroom with warehouse',
      summary: 'Wholesale or retail display combined with a warehouse. Retail share often capped relative to the industrial component.',
      rows: {
        toronto:     { status: 'variance', zones: 'E1.0, E2.0',                    notes: 'Limited retail component; site-specific common.' },
        mississauga: { status: 'variance', zones: 'E2, E3',                        notes: 'Retail capped at ~25% of GFA.' },
        brampton:    { status: 'yes',      zones: 'M1A, M2',                       notes: 'Permitted with retail cap.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Accessory retail permitted.' },
        markham:     { status: 'yes',      zones: 'MC',                            notes: 'Permitted; retail cap.' },
        oakville:    { status: 'variance', zones: 'E3',                            notes: 'Retail cap; SPA.' },
        burlington:  { status: 'yes',      zones: 'BC, GE1',                       notes: 'Permitted in Business Corridor.' },
        milton:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted with cap.' },
        pickering:   { status: 'yes',      zones: 'M2',                            notes: 'Permitted with cap.' },
        ajax:        { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M2',                            notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-B, GI',                      notes: 'Permitted.' }
      }
    },
    'studio': {
      title: 'Film / photo / recording studio',
      summary: 'Production studios for media. Often welcomed in industrial zones as they drive activity without heavy traffic.',
      rows: {
        toronto:     { status: 'yes',      zones: 'E1.0, E2.0, EL1.0',             notes: 'Permitted; Toronto actively supports film employment.' },
        mississauga: { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        brampton:    { status: 'yes',      zones: 'M1, M1A, M2',                   notes: 'Permitted.' },
        vaughan:     { status: 'yes',      zones: 'EM2, EM3',                      notes: 'Permitted.' },
        markham:     { status: 'yes',      zones: 'MB, MC',                        notes: 'Permitted.' },
        oakville:    { status: 'yes',      zones: 'E1, E2, E3',                    notes: 'Permitted.' },
        burlington:  { status: 'yes',      zones: 'GE1, GE2',                      notes: 'Permitted.' },
        milton:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        pickering:   { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        ajax:        { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        whitby:      { status: 'yes',      zones: 'M1, M2',                        notes: 'Permitted.' },
        oshawa:      { status: 'yes',      zones: 'SI-A, SI-B',                    notes: 'Permitted.' }
      }
    }
  };

  var MUNI_ORDER = ['toronto','mississauga','brampton','vaughan','markham','oakville','burlington','milton','pickering','ajax','whitby','oshawa'];

  function statusLabel(s){
    if (s === 'yes')      return { cls: 'yes',      label: 'As-of-right', icon: '&check;' };
    if (s === 'variance') return { cls: 'variance', label: 'Minor variance / SPA', icon: '!' };
    return                      { cls: 'no',       label: 'Prohibited',   icon: '&times;' };
  }

  function summarize(use){
    var cnt = { yes: 0, variance: 0, no: 0 };
    MUNI_ORDER.forEach(function(k){ var r = use.rows[k]; if (r) cnt[r.status]++; });
    var total = cnt.yes + cnt.variance + cnt.no;
    return cnt.yes + ' of ' + total + ' municipalities permit as-of-right, ' + cnt.variance + ' require a variance or SPA, ' + cnt.no + ' prohibit.';
  }

  function render(key){
    var use = DATA[key];
    var wrap = document.getElementById('zoningResults');
    if (!use){
      wrap.innerHTML = '<div class="zoning-empty">Pick a use above to see the permitted zoning designations across the GTA.</div>';
      return;
    }
    var rows = MUNI_ORDER.map(function(k){
      var r = use.rows[k];
      if (!r) return '';
      var s = statusLabel(r.status);
      return '<tr>'
        + '<td><strong>' + MUNI[k].name + '</strong></td>'
        + '<td><span class="z-pill z-' + s.cls + '">' + s.icon + ' ' + s.label + '</span></td>'
        + '<td class="mono">' + r.zones + '</td>'
        + '<td>' + r.notes + '</td>'
        + '<td><a href="' + MUNI[k].bylaw + '" target="_blank" rel="noopener">By-law &rarr;</a></td>'
        + '</tr>';
    }).join('');
    wrap.innerHTML =
      '<div class="zoning-result-head">' +
        '<h2 style="margin:0 0 6px 0;">' + use.title + '</h2>' +
        '<p style="margin:0 0 10px 0;color:var(--text-dim);">' + use.summary + '</p>' +
        '<p style="margin:0;color:var(--text);font-weight:500;">' + summarize(use) + '</p>' +
      '</div>' +
      '<div class="zoning-table-wrap">' +
        '<table class="zoning-table">' +
          '<thead><tr><th>Municipality</th><th>Status</th><th>Permitted zones</th><th>Notes</th><th>Source</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  var sel = document.getElementById('useSelect');
  if (sel){
    sel.addEventListener('change', function(){ render(sel.value); });
  }
})();
