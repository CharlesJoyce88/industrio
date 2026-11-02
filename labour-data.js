/* GTA industrial labour density — synthetic stand-in for StatCan Census 2021 dissemination areas.
 * Each cell:
 *   bounds  — [southLat, westLng, northLat, eastLng]
 *   nm      — submarket name
 *   wh      — warehousing & transport workers (NAICS 484+493)
 *   mfg     — manufacturing workers (NAICS 31-33)
 *   tot     — total industrial labour force in the cell
 *   km2     — approximate cell area (km^2)
 * Density (workers / km^2) is computed at render time.
 */
window.LABOUR_DATA = [
  // ----- Mississauga industrial belt (NAICS 493/484/31-33 heavy) -----
  { bounds: [43.555, -79.715, 43.595, -79.665], nm: 'Mississauga · Dixie/Aerowood',     wh: 5800, mfg: 4200, tot: 10000, km2: 13.2 },
  { bounds: [43.595, -79.715, 43.635, -79.665], nm: 'Mississauga · Tomken/Eglinton',    wh: 5200, mfg: 3900, tot:  9100, km2: 13.2 },
  { bounds: [43.555, -79.665, 43.595, -79.615], nm: 'Mississauga · Dixie/Tradewind',    wh: 4400, mfg: 3100, tot:  7500, km2: 13.2 },
  { bounds: [43.625, -79.760, 43.665, -79.710], nm: 'Mississauga · Meadowvale',         wh: 4800, mfg: 3200, tot:  8000, km2: 13.4 },
  { bounds: [43.585, -79.760, 43.625, -79.710], nm: 'Mississauga · Heartland',          wh: 6100, mfg: 4500, tot: 10600, km2: 13.4 },
  { bounds: [43.625, -79.710, 43.665, -79.660], nm: 'Mississauga · Northeast',          wh: 3400, mfg: 2400, tot:  5800, km2: 13.3 },
  { bounds: [43.555, -79.610, 43.595, -79.560], nm: 'Mississauga · Lakeview/Cawthra',   wh: 1900, mfg: 1500, tot:  3400, km2: 13.1 },
  // ----- Brampton -----
  { bounds: [43.700, -79.760, 43.745, -79.710], nm: 'Brampton · Steeles/Torbram',       wh: 4900, mfg: 3300, tot:  8200, km2: 14.5 },
  { bounds: [43.700, -79.710, 43.745, -79.660], nm: 'Brampton · Airport/Queen',         wh: 4200, mfg: 2800, tot:  7000, km2: 14.5 },
  { bounds: [43.745, -79.760, 43.790, -79.710], nm: 'Brampton · Bramalea/Highway 7',    wh: 3700, mfg: 2400, tot:  6100, km2: 14.7 },
  { bounds: [43.745, -79.710, 43.790, -79.660], nm: 'Brampton · Goreway/Castlemore',    wh: 3100, mfg: 1900, tot:  5000, km2: 14.7 },
  // ----- Vaughan / Concord -----
  { bounds: [43.795, -79.560, 43.840, -79.510], nm: 'Vaughan · Concord',                wh: 5200, mfg: 4300, tot:  9500, km2: 14.8 },
  { bounds: [43.795, -79.510, 43.840, -79.460], nm: 'Vaughan · Highway 7/Jane',         wh: 3900, mfg: 3000, tot:  6900, km2: 14.8 },
  { bounds: [43.840, -79.560, 43.880, -79.510], nm: 'Vaughan · Maple/CN Yards',         wh: 4400, mfg: 2700, tot:  7100, km2: 13.6 },
  { bounds: [43.840, -79.510, 43.880, -79.460], nm: 'Vaughan · Northeast',              wh: 2600, mfg: 1800, tot:  4400, km2: 13.6 },
  // ----- Markham / Richmond Hill industrial -----
  { bounds: [43.835, -79.355, 43.880, -79.305], nm: 'Markham · Highway 7 corridor',     wh: 2200, mfg: 2100, tot:  4300, km2: 14.0 },
  { bounds: [43.835, -79.405, 43.880, -79.355], nm: 'Markham · Woodbine/Steeles',       wh: 2600, mfg: 2400, tot:  5000, km2: 14.0 },
  { bounds: [43.880, -79.355, 43.920, -79.305], nm: 'Markham · 16th/Kennedy',           wh: 1500, mfg: 1300, tot:  2800, km2: 13.7 },
  // ----- Etobicoke -----
  { bounds: [43.640, -79.625, 43.685, -79.575], nm: 'Etobicoke · International Blvd',   wh: 4100, mfg: 2800, tot:  6900, km2: 14.0 },
  { bounds: [43.640, -79.575, 43.685, -79.525], nm: 'Etobicoke · Carlingview/Belfield', wh: 3500, mfg: 2400, tot:  5900, km2: 14.0 },
  { bounds: [43.685, -79.625, 43.725, -79.575], nm: 'Etobicoke · Highway 27',           wh: 2700, mfg: 2000, tot:  4700, km2: 13.4 },
  // ----- Scarborough -----
  { bounds: [43.760, -79.275, 43.800, -79.225], nm: 'Scarborough · Dynamic/Tapscott',   wh: 3200, mfg: 2300, tot:  5500, km2: 13.6 },
  { bounds: [43.760, -79.325, 43.800, -79.275], nm: 'Scarborough · Sheppard/McCowan',   wh: 2400, mfg: 2100, tot:  4500, km2: 13.6 },
  { bounds: [43.715, -79.275, 43.760, -79.225], nm: 'Scarborough · Ellesmere/Bellamy',  wh: 1700, mfg: 1400, tot:  3100, km2: 13.6 },
  // ----- Oakville / Burlington -----
  { bounds: [43.420, -79.745, 43.460, -79.695], nm: 'Oakville · Wyecroft/QEW',          wh: 1900, mfg: 1700, tot:  3600, km2: 12.7 },
  { bounds: [43.350, -79.840, 43.395, -79.790], nm: 'Burlington · North Service Rd',    wh: 2100, mfg: 1900, tot:  4000, km2: 13.0 },
  // ----- Pickering / Ajax -----
  { bounds: [43.835, -79.105, 43.880, -79.055], nm: 'Pickering · Brock/Bayly',          wh: 1400, mfg: 1100, tot:  2500, km2: 13.5 },
  { bounds: [43.835, -79.055, 43.880, -79.005], nm: 'Ajax · Salem/Westney',             wh: 1300, mfg: 900,  tot:  2200, km2: 13.5 },
  // ----- Toronto Central (lower industrial density, more knowledge work) -----
  { bounds: [43.660, -79.460, 43.700, -79.410], nm: 'Toronto · Junction',               wh: 700,  mfg: 800,  tot:  1500, km2: 13.0 },
  { bounds: [43.700, -79.460, 43.740, -79.410], nm: 'Toronto · North York West',        wh: 1100, mfg: 1000, tot:  2100, km2: 13.0 }
];
