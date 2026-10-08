/**
 * Second wave of the catalogue: fixed tables, stainless bath tubs and starter
 * bundles. Added after a client asked for the same *kinds* of product a
 * manufacturer's grooming range carries.
 *
 * ALL OF THIS IS PLACEHOLDER. Names, prices, capacities and finishes are ours
 * and invented to sit sensibly beside the existing range — they are not from a
 * supplier's datasheet. That includes the "was" prices: they are set to about
 * 20-25% above the selling price, like the rest of the catalogue, because a
 * strike-through price that was never charged is a misleading claim. Replace
 * them with the real MRP. None of these products has a photograph yet: the seeder
 * looks for apps/web/public/products/<slug>/01.jpg … 04.jpg and inserts none if
 * they are absent, so a card shows "No image" until real photos are dropped in
 * and the catalogue is re-seeded.
 *
 * Before launch, confirm with the owner: which of these he really sells, the
 * real prices, capacities and warranty, and the HSN code for the tubs
 * (7324, sanitary ware of steel, is our assumption — his accountant decides).
 */
import type { SeedCategory, SeedFaq, SeedProduct, SeedSpec } from './products.data.ts';

export const EXTRA_CATEGORIES: SeedCategory[] = [
  { slug: 'fixed-tables', name: 'Fixed Tables', description: 'No motor, no pump, no hinge. A fixed-height table is the simplest thing that works, and the cheapest way to stop grooming on the floor.', sortOrder: 5 },
  { slug: 'bath-tubs', name: 'Bath Tubs', description: 'Stainless steel tubs with a proper drain and a non-slip floor, so a wash does not end with a wet floor and a wet groomer.', sortOrder: 6 },
  { slug: 'combos', name: 'Combos', description: 'A table and a tub bought together, priced below buying them apart.', sortOrder: 7 },
  { slug: 'cages', name: 'Cages', description: 'Stainless steel cages on castors, from a compact single to a large modular unit, for keeping a dog comfortable before and after grooming.', sortOrder: 8 },
];

const WARRANTY: SeedFaq = {
  question: 'What does the warranty cover?',
  answer: 'The frame and welded structure are covered for the warranty term shown on this page. Wear items such as rubber surfaces, castors, hoses and taps are excluded. Warranty service is handled from our Bengaluru workshop.',
};
const DELIVERY: SeedFaq = {
  question: 'How is it delivered?',
  answer: 'By surface freight, boxed or crated. Delivery is kerbside, so please have a second pair of hands available. You get a tracking number when it leaves our warehouse.',
};
const HOME: SeedFaq = {
  question: 'Is it fine to use at home?',
  answer: 'Yes. It needs no installation, and the footprint is listed in the specification below so you can check it against the space you have.',
};

interface Base {
  slug: string; sku: string; name: string; tagline: string; summary: string; description: string;
  categorySlug: string; price: number; was: number; weightG: number;
  lengthMm: number; widthMm: number; loadKg: number; warrantyMonths: number;
  badges?: string[]; featured?: boolean; hsnCode?: string; stock?: number;
  finishes?: { value: string; hex: string; suffix: string }[];
  specs: SeedSpec[];
  featureTitle: string; featureBody: string;
  stats: { value: string; label: string }[];
  faqs: SeedFaq[];
}

function make(b: Base): SeedProduct {
  const finishes = b.finishes ?? [{ value: 'Standard', hex: '#C9CDD2', suffix: 'STD' }];
  return {
    slug: b.slug, sku: b.sku, name: b.name, tagline: b.tagline, summary: b.summary, description: b.description,
    categorySlug: b.categorySlug,
    basePrice: b.price, compareAtPrice: b.was,
    weightG: b.weightG, lengthMm: b.lengthMm, widthMm: b.widthMm,
    heightMinMm: null, heightMaxMm: null, loadCapacityKg: b.loadKg,
    warrantyMonths: b.warrantyMonths, badges: b.badges ?? [], isFeatured: b.featured ?? false,
    hsnCode: b.hsnCode,
    imageCount: 0,
    variants: finishes.map((f) => ({
      optionName: 'Finish', optionValue: f.value, priceDelta: 0,
      stockQty: b.stock ?? 6, weightG: b.weightG, hexColour: f.hex, skuSuffix: f.suffix,
    })),
    specs: b.specs,
    features: [
      { title: b.featureTitle, body: b.featureBody, layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: b.stats },
    ],
    faqs: [...b.faqs, WARRANTY, DELIVERY],
  };
}

const BLACK_SILVER = [
  { value: 'Silver', hex: '#C9CDD2', suffix: 'SV' },
  { value: 'Black', hex: '#2B2B2E', suffix: 'BK' },
];

function fixedTable(o: {
  size: 'Small' | 'Medium' | 'Large'; suffix: string; price: number; was: number; kg: number;
  lengthMm: number; widthMm: number; deckHeightMm: number; weightG: number; summary: string; who: string; badges?: string[];
}): SeedProduct {
  return make({
    slug: `steady-fixed-table-${o.size.toLowerCase()}`,
    sku: `APS-STEADY-${o.suffix}`,
    name: `Steady Fixed Grooming Table — ${o.size}`,
    tagline: 'Up off the floor. Nothing to break.',
    summary: o.summary,
    description: `${o.summary}\n\nThe deck sits at a fixed ${o.deckHeightMm} mm, with a non-slip rubber top and an adjustable arm and clamp to keep a nervous dog steady. There is no motor, pump or hinge to wear out, which is why people buy it for the home, for a mobile van, or as a second station. ${o.who}`,
    categorySlug: 'fixed-tables',
    price: o.price, was: o.was, weightG: o.weightG,
    lengthMm: o.lengthMm, widthMm: o.widthMm, loadKg: o.kg, warrantyMonths: 12,
    badges: o.badges, featured: o.size === 'Medium',
    finishes: BLACK_SILVER,
    specs: [
      { group: 'Deck', label: 'Dimensions', value: `${o.lengthMm.toLocaleString('en-IN')} × ${o.widthMm} mm` },
      { group: 'Deck', label: 'Fixed deck height', value: `${o.deckHeightMm} mm` },
      { group: 'Deck', label: 'Surface', value: 'Non-slip ribbed rubber, replaceable' },
      { group: 'Frame', label: 'Material', value: 'Powder-coated steel tube' },
      { group: 'Frame', label: 'Feet', value: 'Adjustable levelling feet' },
      { group: 'Load', label: 'Capacity', value: `${o.kg} kg` },
      { group: 'Fitted', label: 'Arm and clamp', value: 'Adjustable arm with noose, clamp-on' },
      { group: 'Shipping', label: 'Boxed weight', value: `${Math.round(o.weightG / 1000) + 4} kg` },
      { group: 'Warranty', label: 'Term', value: '12 months on the frame' },
    ],
    featureTitle: 'Simple on purpose.',
    featureBody: 'A table with nothing that moves has nothing that fails. The clamp-on arm keeps a dog in place at the height you set it, and the levelling feet make it sit square on an uneven floor.',
    stats: [
      { value: `${o.kg}kg`, label: 'Load capacity' },
      { value: `${o.deckHeightMm}mm`, label: 'Deck height' },
      { value: '0', label: 'Moving parts' },
      { value: '12mo', label: 'Frame warranty' },
    ],
    faqs: [
      HOME,
      { question: 'Why is there no height adjustment?', answer: 'That is what keeps it light and inexpensive. If you want to raise and lower the dog, the Anchor hydraulic and Vertex electric tables do that.' },
    ],
  });
}

function bathTub(o: {
  slug: string; sku: string; name: string; tagline: string; summary: string; price: number; was: number;
  kg: number; lengthMm: number; widthMm: number; weightG: number; warrantyMonths: number;
  extra: SeedSpec[]; featureTitle: string; featureBody: string; badges?: string[]; featured?: boolean;
}): SeedProduct {
  return make({
    slug: o.slug, sku: o.sku, name: o.name, tagline: o.tagline, summary: o.summary,
    description: `${o.summary}\n\nThe tub is formed from stainless steel with a sloped floor to a central drain, so water leaves the tub rather than pooling under the dog. The floor is non-slip, which is the single thing that makes a wash calmer for the animal and easier on your back.`,
    categorySlug: 'bath-tubs',
    price: o.price, was: o.was, weightG: o.weightG, lengthMm: o.lengthMm, widthMm: o.widthMm,
    loadKg: o.kg, warrantyMonths: o.warrantyMonths, badges: o.badges, featured: o.featured,
    hsnCode: '7324',
    specs: [
      { group: 'Tub', label: 'Dimensions', value: `${o.lengthMm.toLocaleString('en-IN')} × ${o.widthMm} mm` },
      { group: 'Tub', label: 'Material', value: 'Stainless steel, food-grade finish' },
      { group: 'Tub', label: 'Floor', value: 'Sloped to a central drain, non-slip' },
      { group: 'Load', label: 'Capacity', value: `${o.kg} kg` },
      ...o.extra,
      { group: 'Warranty', label: 'Term', value: `${o.warrantyMonths} months on the tub` },
    ],
    featureTitle: o.featureTitle,
    featureBody: o.featureBody,
    stats: [
      { value: `${o.kg}kg`, label: 'Load capacity' },
      { value: '304', label: 'Stainless steel grade' },
      { value: `${o.warrantyMonths}mo`, label: 'Warranty' },
    ],
    faqs: [
      { question: 'Does it need plumbing?', answer: 'It needs a water supply and a drain. A standard waste outlet and a flexible hose are enough; the tub does not need to be built in.' },
      { question: 'Can I use it for cats and small dogs?', answer: 'Yes. The non-slip floor and raised sides suit small animals as well as large dogs; the capacity above is the limit.' },
    ],
  });
}

function cage(o: {
  slug: string; sku: string; name: string; tagline: string; summary: string; price: number; was: number;
  lengthMm: number; widthMm: number; heightMm: number; weightG: number; dogs: string;
  badges?: string[]; featured?: boolean;
}): SeedProduct {
  return make({
    slug: o.slug, sku: o.sku, name: o.name, tagline: o.tagline, summary: o.summary,
    description: `${o.summary}\n\nThe frame is stainless steel with a removable tray, a smooth door latch and locking castors, so the cage can be wheeled to the table, the tub or the drying area and then held still. ${o.dogs}`,
    categorySlug: 'cages',
    price: o.price, was: o.was, weightG: o.weightG, lengthMm: o.lengthMm, widthMm: o.widthMm,
    loadKg: 0, warrantyMonths: 12, badges: o.badges, featured: o.featured,
    hsnCode: '9402',
    specs: [
      { group: 'Cage', label: 'External size', value: `${o.lengthMm} × ${o.widthMm} × ${o.heightMm} mm` },
      { group: 'Cage', label: 'Material', value: 'Stainless steel frame and bars' },
      { group: 'Cage', label: 'Floor', value: 'Removable tray for cleaning' },
      { group: 'Cage', label: 'Mobility', value: 'Castors, with locking brakes' },
      { group: 'Cage', label: 'Door', value: 'Front door with secure latch' },
      { group: 'Shipping', label: 'Boxed weight', value: `${Math.round(o.weightG / 1000) + 5} kg` },
      { group: 'Warranty', label: 'Term', value: '12 months on the frame' },
    ],
    featureTitle: 'Easy to keep clean.',
    featureBody: 'Smooth stainless steel wipes down in a minute, and the removable tray means the floor of the cage is never out of reach.',
    stats: [
      { value: 'SS', label: 'Stainless steel' },
      { value: '4', label: 'Locking castors' },
      { value: '12mo', label: 'Frame warranty' },
    ],
    faqs: [
      { question: 'Which size should I choose?', answer: 'Pick the cage in which the dog can stand up, turn round and lie down comfortably. The external size is listed above so you can check it against the space you have.' },
      { question: 'Can it be stacked?', answer: 'Do not stack cages unless the product page says the model is built for it. Ask us before you plan a stacked setup.' },
    ],
  });
}

export const EXTRA_PRODUCTS: SeedProduct[] = [
  fixedTable({
    size: 'Small', suffix: 'S', price: 990_000, was: 1_290_000, kg: 40,
    lengthMm: 600, widthMm: 450, deckHeightMm: 800, weightG: 9_000,
    summary: 'A compact fixed-height table for cats and small breeds, light enough to move between rooms.',
    who: 'It is the one to buy if the dog weighs less than a school bag.',
    badges: ['Entry price'],
  }),
  fixedTable({
    size: 'Medium', suffix: 'M', price: 1_190_000, was: 1_550_000, kg: 75,
    lengthMm: 900, widthMm: 560, deckHeightMm: 850, weightG: 14_000,
    summary: 'The all-rounder: a fixed table big enough for a labrador and small enough for a spare room.',
    who: 'Most households and small studios end up here.',
    badges: ['Popular'],
  }),
  fixedTable({
    size: 'Large', suffix: 'L', price: 1_790_000, was: 2_300_000, kg: 120,
    lengthMm: 1_200, widthMm: 600, deckHeightMm: 900, weightG: 22_000,
    summary: 'A heavy-duty fixed table for large breeds, with a deck long enough to groom without the dog hanging off the end.',
    who: 'Choose this for anything from a golden retriever up.',
  }),

  bathTub({
    slug: 'aqua-s-stainless-bath-tub-small', sku: 'APS-AQUA-S',
    name: 'Aqua S Stainless Bath Tub — Small',
    tagline: 'A proper wash, at a sensible size.',
    summary: 'A compact stainless tub for cats and small breeds, with a non-slip floor and a drain that actually drains.',
    price: 3_490_000, was: 4_500_000, kg: 45, lengthMm: 800, widthMm: 520, weightG: 18_000, warrantyMonths: 12,
    extra: [
      { group: 'Tub', label: 'Wall height', value: '300 mm' },
      { group: 'Fitted', label: 'Drain', value: '40 mm waste outlet' },
      { group: 'Frame', label: 'Legs', value: 'Stainless, adjustable feet' },
    ],
    featureTitle: 'Water goes down, not around.',
    featureBody: 'The floor slopes to a central drain, so the tub empties without you tilting it, and the dog is not standing in a puddle.',
    badges: ['Compact'],
  }),
  bathTub({
    slug: 'aqua-f-front-entry-stainless-tub', sku: 'APS-AQUA-F',
    name: 'Aqua F Front-Entry Stainless Tub',
    tagline: 'The door that saves your back.',
    summary: 'A full-size stainless tub with a front entry, so a large dog walks in instead of being lifted over the wall. A tap is included.',
    price: 4_690_000, was: 6_000_000, kg: 100, lengthMm: 1_200, widthMm: 650, weightG: 38_000, warrantyMonths: 12,
    extra: [
      { group: 'Tub', label: 'Entry', value: 'Front door with ramp' },
      { group: 'Fitted', label: 'Tap', value: 'Mixer tap with hose, included' },
      { group: 'Fitted', label: 'Drain', value: '50 mm waste outlet' },
      { group: 'Frame', label: 'Legs', value: 'Stainless, adjustable feet' },
    ],
    featureTitle: 'Walk in. Do not lift.',
    featureBody: 'Lifting a thirty-kilo dog over a wall is how groomers hurt their backs. The front door drops to a ramp, so the dog walks in and you stay upright.',
    badges: ['Tap included'], featured: true,
  }),
  bathTub({
    slug: 'aqua-e-electric-lift-bath-tub', sku: 'APS-AQUA-E',
    name: 'Aqua E Electric Lift Bath Tub',
    tagline: 'Raise it for the wash, lower it for the dog.',
    summary: 'A stainless tub on an electric lift: set it low for the dog to step in, then raise it to a comfortable working height.',
    price: 8_490_000, was: 10_900_000, kg: 150, lengthMm: 1_300, widthMm: 700, weightG: 62_000, warrantyMonths: 24,
    extra: [
      { group: 'Lift', label: 'Mechanism', value: 'Electric actuator with foot control' },
      { group: 'Lift', label: 'Height range', value: '450 – 900 mm' },
      { group: 'Tub', label: 'Entry', value: 'Front door with ramp' },
      { group: 'Fitted', label: 'Tap', value: 'Mixer tap with hose, included' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
    ],
    featureTitle: 'Low to enter, high to work.',
    featureBody: 'The dog steps in with the tub down at 450 mm, and you raise it to a height you can work at without bending. The same idea as our electric tables, applied to the wash.',
    badges: ['Electric lift'],
  }),

  make({
    slug: 'starter-studio-bundle', sku: 'APS-COMBO-STUDIO',
    name: 'Starter Studio Bundle',
    tagline: 'A table, a tub and a second table.',
    summary: 'Everything for a first grooming room: a Vertex Eco electric table, a small fixed table and an Aqua S stainless tub, bought together.',
    description: 'Three pieces that cover the whole job: groom on the Vertex Eco, keep the Steady Small beside it for cats and a quick trim, and wash in the Aqua S.\n\nThe bundle includes: Vertex Eco Electric Lifting Table, Steady Fixed Grooming Table — Small, and Aqua S Stainless Bath Tub — Small. Delivered as three separate consignments.',
    categorySlug: 'combos',
    price: 8_490_000, was: 9_200_000, weightG: 90_000, lengthMm: 1_220, widthMm: 610, loadKg: 120, warrantyMonths: 12,
    badges: ['Save ₹7,100'], featured: true, stock: 4,
    specs: [
      { group: 'Includes', label: 'Table', value: 'Vertex Eco Electric Lifting Table' },
      { group: 'Includes', label: 'Second table', value: 'Steady Fixed Grooming Table — Small' },
      { group: 'Includes', label: 'Tub', value: 'Aqua S Stainless Bath Tub — Small' },
      { group: 'Shipping', label: 'Consignments', value: '3, shipped separately' },
    ],
    featureTitle: 'One order, one room.',
    featureBody: 'Buying the three together costs ₹7,100 less than buying them one by one, and means one delivery conversation instead of three.',
    stats: [
      { value: '3', label: 'Pieces' },
      { value: '₹7,100', label: 'Saved' },
    ],
    faqs: [
      { question: 'Can I choose the finishes?', answer: 'The bundle ships in the standard finish of each piece. If you want a specific finish, order the pieces separately.' },
    ],
  }),
  make({
    slug: 'beginner-grooming-kit', sku: 'APS-COMBO-BEGIN',
    name: 'Beginner Grooming Kit',
    tagline: 'A hydraulic table and a fixed one.',
    summary: 'An Anchor H5 hydraulic table for the dog you are working on, and a Steady Medium fixed table for everything else.',
    description: 'The simplest useful pair: an Anchor H5 hydraulic table you raise with a foot pump, and a Steady Medium fixed table beside it. No power needed for either.\n\nThe bundle includes: Anchor H5 Hydraulic Grooming Table and Steady Fixed Grooming Table — Medium.',
    categorySlug: 'combos',
    price: 4_490_000, was: 5_030_000, weightG: 55_000, lengthMm: 1_100, widthMm: 600, loadKg: 100, warrantyMonths: 12,
    stock: 4,
    specs: [
      { group: 'Includes', label: 'Table', value: 'Anchor H5 Hydraulic Grooming Table' },
      { group: 'Includes', label: 'Second table', value: 'Steady Fixed Grooming Table — Medium' },
      { group: 'Shipping', label: 'Consignments', value: '2, shipped separately' },
    ],
    featureTitle: 'No plug required.',
    featureBody: 'Both tables work without electricity, which makes this kit a safe first buy for a home or a mobile setup.',
    stats: [
      { value: '2', label: 'Tables' },
      { value: '₹5,400', label: 'Saved' },
    ],
    faqs: [
      { question: 'Can I choose the finishes?', answer: 'The kit ships in the standard finish of each table. If you want a specific finish, order the tables separately.' },
    ],
  }),

  cage({
    slug: 'compact-stainless-cage', sku: 'APS-CAGE-C', name: 'Compact Stainless Cage',
    tagline: 'Small dogs, small footprint.',
    summary: 'A compact stainless steel cage on castors for small breeds, easy to wheel beside the table and wipe clean.',
    price: 1_890_000, was: 2_350_000, lengthMm: 650, widthMm: 480, heightMm: 600, weightG: 18_000,
    dogs: 'Suited to small breeds such as a Maltese or a Pomeranian.', badges: ['Compact'],
  }),
  cage({
    slug: 'modular-cage-small', sku: 'APS-CAGE-MS', name: 'Modular Cage — Small',
    tagline: 'A modular cage that fits the room.',
    summary: 'A small modular stainless steel cage with a front door and removable tray, for dogs up to the size of a Dachshund or a Beagle.',
    price: 1_990_000, was: 2_490_000, lengthMm: 750, widthMm: 520, heightMm: 650, weightG: 22_000,
    dogs: 'Suited to dogs up to the size of a Dachshund or a Beagle.',
  }),
  cage({
    slug: 'modular-cage-medium', sku: 'APS-CAGE-MM', name: 'Modular Cage — Medium',
    tagline: 'Room to stand, turn and settle.',
    summary: 'A medium modular stainless steel cage on castors, with room for a Corgi or a Cocker Spaniel to stand and turn.',
    price: 2_490_000, was: 3_100_000, lengthMm: 900, widthMm: 620, heightMm: 750, weightG: 30_000,
    dogs: 'Suited to dogs up to the size of a Corgi or a Cocker Spaniel.', featured: true, badges: ['Popular'],
  }),
  cage({
    slug: 'modular-cage-large', sku: 'APS-CAGE-ML', name: 'Modular Cage — Large',
    tagline: 'For the big breeds.',
    summary: 'A large modular stainless steel cage on heavy castors, with a wide door for large breeds.',
    price: 2_990_000, was: 3_700_000, lengthMm: 1_100, widthMm: 720, heightMm: 850, weightG: 42_000,
    dogs: 'Suited to large breeds such as a Bernese Mountain Dog or a Labrador.',
  }),
];
