// ============================================================================
// agents-data.js — Demo agent roster for industrio.
//
// DATA SOURCE SWAP POINT:
//   Today the Agents index page (agents.html) and Agent Profile page
//   (agent-profile.html) are powered by window.INDUSTRIO_AGENTS below.
//   When the real backend is ready, swap this file for a `fetch()` against
//   the API, keeping the same record shape.
//
// Record shape (per agent):
//   {
//     id:            kebab-case slug (used in profile URL: agent-profile.html?id=jane-doe)
//     name:          "Jane Doe"
//     title:         "Sales Representative" | "Broker" | "Broker of Record"
//     photo:         full URL to headshot (ui-avatars auto-generates from name)
//     languages:     ["English", "Mandarin"]
//     areas:         ["East Mississauga", "Dixie"]   // pills on the card
//     primary_city:  "Mississauga"                    // used for the area filter grouping
//     rating:        4.8                               // 1.0 - 5.0
//     review_count:  47
//     years_experience: 12
//     stats: {
//       deals_total:    58,
//       sf_leased:      412000,
//       sf_sold:        186000,
//       avg_deal_size:  10300
//     },
//     deals: [
//       {
//         type: "lease" | "sale",
//         address: "1030 Kamato Rd",
//         city: "Mississauga",
//         lat: 43.64, lng: -79.64,
//         size_sf: 9055,
//         rate_or_price: 15.00,       // $/SF for lease, total $ or $/SF for sale
//         closed_at: "2026-03-14"
//       },
//       ...
//     ],
//     turf: {
//       label: "East Mississauga",
//       polygon: [[lat,lng], [lat,lng], ...]   // closed polygon for the agent's assigned area
//     },
//     bio: "Short one-paragraph bio shown on the profile page."
//   }
// ============================================================================

window.INDUSTRIO_AGENTS = [
  {
    id: "mia-cheng",
    name: "Mia Cheng",
    title: "Sales Representative",
    photo: "https://ui-avatars.com/api/?name=Mia+Cheng&background=0d9488&color=fff&size=256&bold=true",
    languages: ["English", "Mandarin"],
    areas: ["East Mississauga", "Dixie", "Gateway"],
    primary_city: "Mississauga",
    rating: 4.8,
    review_count: 47,
    years_experience: 9,
    stats: { deals_total: 58, sf_leased: 412000, sf_sold: 186000, avg_deal_size: 10300 },
    deals: [
      { type: "lease", address: "2446 Cawthra Rd",      city: "Mississauga", lat: 43.5755, lng: -79.6213, size_sf: 11200, rate_or_price: 15.75, closed_at: "2026-04-02" },
      { type: "lease", address: "5400 Dixie Rd Unit 8", city: "Mississauga", lat: 43.6155, lng: -79.6160, size_sf:  8600, rate_or_price: 16.20, closed_at: "2026-03-18" },
      { type: "sale",  address: "1280 Aerowood Dr",     city: "Mississauga", lat: 43.6485, lng: -79.6560, size_sf: 14200, rate_or_price: 295,   closed_at: "2026-02-10" },
      { type: "lease", address: "6610 Tomken Rd",       city: "Mississauga", lat: 43.6525, lng: -79.6305, size_sf: 12800, rate_or_price: 15.40, closed_at: "2026-01-22" },
      { type: "lease", address: "1030 Kamato Rd",       city: "Mississauga", lat: 43.6430, lng: -79.6420, size_sf:  9055, rate_or_price: 15.00, closed_at: "2025-12-05" },
      { type: "sale",  address: "5511 Tomken Rd",       city: "Mississauga", lat: 43.6335, lng: -79.6477, size_sf:  4182, rate_or_price: 310,   closed_at: "2025-10-28" }
    ],
    turf: {
      label: "East Mississauga + Dixie",
      polygon: [[43.605,-79.665],[43.665,-79.665],[43.665,-79.580],[43.605,-79.580],[43.605,-79.665]]
    },
    bio: "Nine years focused on multi-tenant industrial in East Mississauga and the Dixie corridor. Specializes in 5-25k SF units for logistics and light-manufacturing tenants."
  },
  {
    id: "david-ross",
    name: "David Ross",
    title: "Broker",
    photo: "https://ui-avatars.com/api/?name=David+Ross&background=0f1e4e&color=fff&size=256&bold=true",
    languages: ["English"],
    areas: ["West Mississauga", "Oakville", "Burlington"],
    primary_city: "Mississauga",
    rating: 4.6,
    review_count: 62,
    years_experience: 15,
    stats: { deals_total: 91, sf_leased: 680000, sf_sold: 420000, avg_deal_size: 12200 },
    deals: [
      { type: "lease", address: "2450 Meadowvale Blvd",  city: "Mississauga", lat: 43.5895, lng: -79.7235, size_sf: 13400, rate_or_price: 16.00, closed_at: "2026-04-15" },
      { type: "lease", address: "1650 Courtneypark Dr",  city: "Mississauga", lat: 43.6200, lng: -79.6885, size_sf: 14600, rate_or_price: 16.80, closed_at: "2026-03-01" },
      { type: "sale",  address: "3280 Mavis Rd",         city: "Mississauga", lat: 43.5920, lng: -79.6800, size_sf: 18500, rate_or_price: 315,   closed_at: "2026-02-20" },
      { type: "lease", address: "2880 Argentia Rd",      city: "Mississauga", lat: 43.6410, lng: -79.7175, size_sf: 13800, rate_or_price: 17.10, closed_at: "2026-01-12" },
      { type: "lease", address: "7001 Winston Churchill",city: "Mississauga", lat: 43.5750, lng: -79.7225, size_sf:  9800, rate_or_price: 16.50, closed_at: "2025-11-18" },
      { type: "sale",  address: "3135 Mainway",          city: "Burlington",  lat: 43.3875, lng: -79.7550, size_sf: 22000, rate_or_price: 285,   closed_at: "2025-09-30" }
    ],
    turf: {
      label: "West Mississauga + Halton",
      polygon: [[43.555,-79.790],[43.670,-79.790],[43.670,-79.680],[43.555,-79.680],[43.555,-79.790]]
    },
    bio: "Fifteen years building relationships in West Mississauga and the Halton industrial corridor. Known for freestanding and user-sale transactions in the 15-50k SF range."
  },
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    title: "Sales Representative",
    photo: "https://ui-avatars.com/api/?name=Priya+Sharma&background=b45309&color=fff&size=256&bold=true",
    languages: ["English", "Hindi", "Punjabi"],
    areas: ["Brampton", "Caledon"],
    primary_city: "Brampton",
    rating: 4.9,
    review_count: 38,
    years_experience: 7,
    stats: { deals_total: 44, sf_leased: 285000, sf_sold: 110000, avg_deal_size: 9000 },
    deals: [
      { type: "lease", address: "8800 Airport Rd",      city: "Brampton", lat: 43.7140, lng: -79.6340, size_sf: 10200, rate_or_price: 14.50, closed_at: "2026-04-28" },
      { type: "lease", address: "120 Walker Dr",        city: "Brampton", lat: 43.7240, lng: -79.7420, size_sf: 15800, rate_or_price: 15.85, closed_at: "2026-03-07" },
      { type: "lease", address: "9080 Goreway Dr",      city: "Brampton", lat: 43.7310, lng: -79.6260, size_sf:  7200, rate_or_price: 14.25, closed_at: "2026-02-14" },
      { type: "sale",  address: "35 Walker Dr",         city: "Brampton", lat: 43.7225, lng: -79.7440, size_sf: 11500, rate_or_price: 275,   closed_at: "2025-12-18" },
      { type: "lease", address: "7800 Kennedy Rd S",    city: "Brampton", lat: 43.7030, lng: -79.7120, size_sf:  5400, rate_or_price: 15.00, closed_at: "2025-10-10" }
    ],
    turf: {
      label: "Brampton + Caledon",
      polygon: [[43.680,-79.830],[43.790,-79.830],[43.790,-79.700],[43.680,-79.700],[43.680,-79.830]]
    },
    bio: "Deep Brampton connections across South Asian manufacturing and logistics tenants. Flexible deal structures, often involving sublease assignments and expansion options."
  },
  {
    id: "marco-rizzo",
    name: "Marco Rizzo",
    title: "Broker of Record",
    photo: "https://ui-avatars.com/api/?name=Marco+Rizzo&background=5b21b6&color=fff&size=256&bold=true",
    languages: ["English", "Italian"],
    areas: ["Vaughan", "Concord"],
    primary_city: "Vaughan",
    rating: 4.7,
    review_count: 71,
    years_experience: 18,
    stats: { deals_total: 112, sf_leased: 920000, sf_sold: 540000, avg_deal_size: 13600 },
    deals: [
      { type: "lease", address: "2700 Steeles Ave W",  city: "Vaughan", lat: 43.7800, lng: -79.5340, size_sf: 16800, rate_or_price: 17.25, closed_at: "2026-04-20" },
      { type: "lease", address: "8500 Keele St",        city: "Vaughan", lat: 43.8095, lng: -79.5075, size_sf: 13500, rate_or_price: 17.40, closed_at: "2026-03-18" },
      { type: "sale",  address: "7700 Pine Valley Dr",  city: "Vaughan", lat: 43.8160, lng: -79.5720, size_sf: 16500, rate_or_price: 305,   closed_at: "2026-02-08" },
      { type: "lease", address: "1 Concord Rd",         city: "Vaughan", lat: 43.7850, lng: -79.4820, size_sf: 21000, rate_or_price: 18.10, closed_at: "2026-01-04" },
      { type: "sale",  address: "35 Adesso Dr",         city: "Vaughan", lat: 43.7980, lng: -79.5030, size_sf: 46000, rate_or_price: 295,   closed_at: "2025-11-15" },
      { type: "lease", address: "35 Caldari Rd",        city: "Vaughan", lat: 43.8180, lng: -79.5150, size_sf: 12200, rate_or_price: 17.90, closed_at: "2025-09-22" }
    ],
    turf: {
      label: "Vaughan + Concord",
      polygon: [[43.760,-79.580],[43.835,-79.580],[43.835,-79.470],[43.760,-79.470],[43.760,-79.580]]
    },
    bio: "Vaughan's industrial market from Concord to Pine Valley. Specializes in 15-50k SF mid-bay and user-sale deals with Italian-Canadian owner-operators."
  },
  {
    id: "alex-wu",
    name: "Alex Wu",
    title: "Sales Representative",
    photo: "https://ui-avatars.com/api/?name=Alex+Wu&background=14b8a6&color=fff&size=256&bold=true",
    languages: ["English", "Cantonese", "Mandarin"],
    areas: ["Markham", "Richmond Hill"],
    primary_city: "Markham",
    rating: 4.8,
    review_count: 29,
    years_experience: 6,
    stats: { deals_total: 32, sf_leased: 210000, sf_sold: 95000, avg_deal_size: 9500 },
    deals: [
      { type: "sale",  address: "500 Main St N",      city: "Markham", lat: 43.8630, lng: -79.3200, size_sf: 18000, rate_or_price: 310, closed_at: "2026-04-05" },
      { type: "lease", address: "3600 Steeles Ave E", city: "Markham", lat: 43.8200, lng: -79.3400, size_sf: 11000, rate_or_price: 18.75, closed_at: "2026-02-28" },
      { type: "lease", address: "80 Allstate Pkwy",   city: "Markham", lat: 43.8540, lng: -79.3425, size_sf:  7500, rate_or_price: 19.00, closed_at: "2026-01-14" },
      { type: "lease", address: "7700 Woodbine Ave",  city: "Markham", lat: 43.8300, lng: -79.3610, size_sf:  5800, rate_or_price: 18.50, closed_at: "2025-11-02" }
    ],
    turf: {
      label: "Markham + Richmond Hill",
      polygon: [[43.800,-79.420],[43.900,-79.420],[43.900,-79.290],[43.800,-79.290],[43.800,-79.420]]
    },
    bio: "Markham-born and raised. Focused on smaller multi-tenant industrial condos popular with Mandarin-speaking entrepreneurs and e-commerce operators."
  },
  {
    id: "susan-oneill",
    name: "Susan O'Neill",
    title: "Broker",
    photo: "https://ui-avatars.com/api/?name=Susan+O%27Neill&background=be185d&color=fff&size=256&bold=true",
    languages: ["English"],
    areas: ["Etobicoke", "West Humber-Clairville"],
    primary_city: "Toronto",
    rating: 4.5,
    review_count: 53,
    years_experience: 14,
    stats: { deals_total: 77, sf_leased: 510000, sf_sold: 275000, avg_deal_size: 10800 },
    deals: [
      { type: "lease", address: "65 International Blvd", city: "Etobicoke", lat: 43.6815, lng: -79.5995, size_sf:  9500, rate_or_price: 14.75, closed_at: "2026-04-11" },
      { type: "lease", address: "125 Carlingview Dr",    city: "Etobicoke", lat: 43.6890, lng: -79.5880, size_sf:  9200, rate_or_price: 15.20, closed_at: "2026-02-25" },
      { type: "sale",  address: "550 Browns Line",       city: "Etobicoke", lat: 43.6020, lng: -79.5420, size_sf: 14000, rate_or_price: 325,   closed_at: "2026-01-30" },
      { type: "lease", address: "100 Rexdale Blvd",      city: "Etobicoke", lat: 43.7250, lng: -79.5720, size_sf:  6800, rate_or_price: 16.00, closed_at: "2025-12-14" },
      { type: "lease", address: "900 Albion Rd",         city: "Etobicoke", lat: 43.7470, lng: -79.5920, size_sf: 12500, rate_or_price: 15.60, closed_at: "2025-10-08" }
    ],
    turf: {
      label: "Etobicoke + West Humber-Clairville",
      polygon: [[43.605,-79.620],[43.755,-79.620],[43.755,-79.530],[43.605,-79.530],[43.605,-79.620]]
    },
    bio: "Etobicoke industrial since 2012, from Humber Bay freestanders to Rexdale multi-tenant. Known for deep landlord relationships and fast quiet-market placements."
  },
  {
    id: "jamal-ibrahim",
    name: "Jamal Ibrahim",
    title: "Sales Representative",
    photo: "https://ui-avatars.com/api/?name=Jamal+Ibrahim&background=047857&color=fff&size=256&bold=true",
    languages: ["English", "Arabic", "French"],
    areas: ["Scarborough", "Pickering"],
    primary_city: "Scarborough",
    rating: 4.7,
    review_count: 24,
    years_experience: 5,
    stats: { deals_total: 28, sf_leased: 165000, sf_sold: 72000, avg_deal_size: 8500 },
    deals: [
      { type: "lease", address: "80 Dynamic Dr",       city: "Scarborough", lat: 43.7770, lng: -79.2495, size_sf: 12200, rate_or_price: 15.60, closed_at: "2026-04-22" },
      { type: "lease", address: "95 Dynamic Dr",       city: "Scarborough", lat: 43.7795, lng: -79.2510, size_sf: 10800, rate_or_price: 14.85, closed_at: "2026-03-10" },
      { type: "lease", address: "160 Progress Ave",    city: "Scarborough", lat: 43.7850, lng: -79.2560, size_sf:  6400, rate_or_price: 15.40, closed_at: "2026-01-19" },
      { type: "sale",  address: "1125 Finch Ave E",    city: "Scarborough", lat: 43.7940, lng: -79.2920, size_sf:  8200, rate_or_price: 280,   closed_at: "2025-11-27" }
    ],
    turf: {
      label: "Scarborough + Pickering",
      polygon: [[43.760,-79.310],[43.825,-79.310],[43.825,-79.190],[43.760,-79.190],[43.760,-79.310]]
    },
    bio: "Fast-rising Scarborough broker. Ex-logistics operations background means he reads a space the way the tenant will use it, not the way the brochure describes it."
  },
  {
    id: "rachel-mendoza",
    name: "Rachel Mendoza",
    title: "Sales Representative",
    photo: "https://ui-avatars.com/api/?name=Rachel+Mendoza&background=7c2d12&color=fff&size=256&bold=true",
    languages: ["English", "Spanish", "Tagalog"],
    areas: ["North Mississauga", "Meadowvale"],
    primary_city: "Mississauga",
    rating: 4.6,
    review_count: 41,
    years_experience: 10,
    stats: { deals_total: 54, sf_leased: 360000, sf_sold: 142000, avg_deal_size: 9400 },
    deals: [
      { type: "lease", address: "7001 Mavis Rd",         city: "Mississauga", lat: 43.6420, lng: -79.7300, size_sf: 10500, rate_or_price: 16.40, closed_at: "2026-04-08" },
      { type: "lease", address: "2400 Matheson Blvd W",  city: "Mississauga", lat: 43.6265, lng: -79.6880, size_sf:  8900, rate_or_price: 16.75, closed_at: "2026-02-22" },
      { type: "sale",  address: "6655 Kitimat Rd",       city: "Mississauga", lat: 43.6020, lng: -79.7650, size_sf: 15200, rate_or_price: 305,   closed_at: "2026-01-11" },
      { type: "lease", address: "2600 Meadowvale Blvd",  city: "Mississauga", lat: 43.5900, lng: -79.7230, size_sf:  7200, rate_or_price: 16.10, closed_at: "2025-12-02" },
      { type: "lease", address: "2810 Argentia Rd",      city: "Mississauga", lat: 43.6380, lng: -79.7170, size_sf: 11800, rate_or_price: 17.00, closed_at: "2025-10-24" }
    ],
    turf: {
      label: "North Mississauga + Meadowvale",
      polygon: [[43.605,-79.790],[43.670,-79.790],[43.670,-79.680],[43.605,-79.680],[43.605,-79.790]]
    },
    bio: "Meadowvale and Heartland since 2016. Specializes in tenant-side representation for growing consumer-products and food-and-beverage businesses."
  }
];

// Convenience helpers for the pages.
window.INDUSTRIO_AGENTS_BY_ID = {};
window.INDUSTRIO_AGENTS.forEach(function(a){ window.INDUSTRIO_AGENTS_BY_ID[a.id] = a; });

// Unique list of all distinct area pills across the roster — used by the
// Area filter on agents.html.
window.INDUSTRIO_AGENT_AREAS = (function(){
  var set = {};
  window.INDUSTRIO_AGENTS.forEach(function(a){ a.areas.forEach(function(x){ set[x] = true; }); });
  return Object.keys(set).sort();
})();
