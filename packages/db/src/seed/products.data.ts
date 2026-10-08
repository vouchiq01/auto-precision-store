/**
 * Seed catalogue for Auto Precision.
 *
 * Original product names, copy and specifications. The *structure* mirrors what
 * the professional grooming-table category expects (lift mechanism, load rating,
 * surface, frame, power draw) so the data shape is right when real assets land;
 * none of the reference site's photography or listing text is reproduced here.
 *
 * Money is in paise. Weights in grams. Dimensions in millimetres.
 */

export interface SeedSpec { group: string; label: string; value: string }
export interface SeedFeature {
  eyebrow?: string; title: string; body?: string;
  layout: 'media_right' | 'media_left' | 'media_full' | 'stat_row' | 'quote';
  stats?: { value: string; label: string }[];
}
export interface SeedFaq { question: string; answer: string }
export interface SeedVariant {
  optionName: string; optionValue: string; priceDelta: number;
  stockQty: number; weightG: number; hexColour?: string; skuSuffix: string;
}

export interface SeedProduct {
  slug: string; sku: string; name: string; tagline: string; summary: string;
  description: string; categorySlug: string;
  basePrice: number; compareAtPrice: number;
  weightG: number; lengthMm: number; widthMm: number;
  /** Null for products with no height travel (fixed tables, tubs, bundles). */
  heightMinMm: number | null; heightMaxMm: number | null; loadCapacityKg: number;
  warrantyMonths: number; badges: string[]; isFeatured: boolean;
  imageCount: number;
  /** Defaults to 9403 (furniture). Tubs are steel sanitary ware. */
  hsnCode?: string;
  /** Photographs are .jpg; the round range ships drawn illustrations instead. */
  imageExt?: 'jpg' | 'svg';
  variants: SeedVariant[];
  specs: SeedSpec[];
  features: SeedFeature[];
  faqs: SeedFaq[];
}

export interface SeedCategory { slug: string; name: string; description: string; sortOrder: number }

export const CATEGORIES: SeedCategory[] = [
  { slug: 'electric-lifting', name: 'Electric Lifting', description: 'Motorised columns that raise a settled dog to working height without a word of protest. Built to take eight hours a day.', sortOrder: 1 },
  { slug: 'hydraulic', name: 'Hydraulic', description: 'Foot-pump lift with nothing to plug in. Mechanically simple, service-friendly, and unbothered by a power cut.', sortOrder: 2 },
  { slug: 'portable', name: 'Portable', description: 'Light enough to carry to a client’s home, rigid enough to work on when you get there.', sortOrder: 3 },
  { slug: 'foldable', name: 'Foldable', description: 'Flat-packing tables for groomers who share a room with something else.', sortOrder: 4 },
  { slug: 'round-rotating', name: 'Round & Rotating', description: 'A circular deck on a single pedestal that spins under the dog. No corners to walk around, the smallest footprint in the range, and the easiest table to live with at home.', sortOrder: 3 },
  { slug: 'accessories', name: 'Accessories', description: 'Arms, nooses and ramps that turn a table into a working station.', sortOrder: 9 },
];

const WARRANTY_FAQ: SeedFaq = {
  question: 'What does the warranty cover?',
  answer: 'The frame and welded structure are covered for the full warranty term. Electrical components — motor, controller, switch — are covered for 12 months. Wear items such as the rubber surface, castors and noose are excluded. Warranty service is handled from our Bengaluru workshop; for the first 12 months we collect and return at our cost.',
};

const DELIVERY_FAQ: SeedFaq = {
  question: 'How is a table this heavy delivered?',
  answer: 'By surface freight, crated on a pallet. Delivery is kerbside — the courier will not carry it up stairs — so please have a second pair of hands available. You will get a tracking number when the crate leaves our warehouse, and the courier calls before arriving.',
};

export const PRODUCTS: SeedProduct[] = [
  {
    slug: 'apex-e9-electric-grooming-table',
    sku: 'APS-APEX-E9',
    name: 'Apex E9 Electric Grooming Table',
    tagline: 'The one you buy once.',
    summary: 'Our flagship. A 120 kg column, a diffused LED halo that kills shadow under the belly, and a frame we have not been able to make flex.',
    description: 'The E9 is what happens when you stop designing to a price. A single-column actuator lifts 120 kg from 540 mm to 1,050 mm in eleven seconds, quietly enough to hold a conversation over. The halo above the deck is not a lamp bolted to an arm — it is a diffused ring that puts even light under the jaw and behind the elbow, which is where matting hides and where every overhead light in the world casts a shadow.\n\nUnderneath, the base is a single folded steel plate rather than a welded assembly of tube. It costs more to make and it is the reason the table does not walk across the floor when a large dog shifts its weight.',
    categorySlug: 'electric-lifting',
    basePrice: 11_240_000, compareAtPrice: 14_800_000,
    weightG: 58_000, lengthMm: 1_220, widthMm: 610, heightMinMm: 540, heightMaxMm: 1_050, loadCapacityKg: 120,
    warrantyMonths: 36, badges: ['Flagship', '3-year frame'], isFeatured: true, imageCount: 4,
    variants: [
      { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 6, weightG: 58_000, hexColour: '#2B2B2E', skuSuffix: 'GR' },
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 3, weightG: 58_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
    ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Single-column electric actuator' },
      { group: 'Lift', label: 'Height range', value: '540 – 1,050 mm' },
      { group: 'Lift', label: 'Full travel time', value: '11 seconds' },
      { group: 'Lift', label: 'Load capacity', value: '120 kg' },
      { group: 'Lift', label: 'Noise at 1 m', value: '48 dB' },
      { group: 'Deck', label: 'Dimensions', value: '1,220 × 610 mm' },
      { group: 'Deck', label: 'Surface', value: '8 mm ribbed natural rubber, replaceable' },
      { group: 'Deck', label: 'Substrate', value: '18 mm marine-grade ply' },
      { group: 'Lighting', label: 'Type', value: 'Diffused LED halo, 4,000 K' },
      { group: 'Lighting', label: 'Output', value: '2,400 lm, stepless dimming' },
      { group: 'Frame', label: 'Base', value: 'Single folded 6 mm steel plate' },
      { group: 'Frame', label: 'Finish', value: 'Powder coat over zinc primer' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Power', label: 'Draw', value: '240 W peak, 0.4 W standby' },
      { group: 'Controls', label: 'Foot control', value: 'Full-width bar, both sides' },
      { group: 'Controls', label: 'Memory', value: '3 stored heights' },
      { group: 'Shipping', label: 'Crated weight', value: '71 kg' },
      { group: 'Warranty', label: 'Term', value: '36 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Lift', title: 'Eleven seconds, end to end.', body: 'A single column instead of twin actuators means nothing to synchronise and nothing to fall out of sync two years in. It carries 120 kg — a Saint Bernard and your forearms leaning on the edge — without the top plate deflecting enough to measure.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '120kg', label: 'Load capacity' }, { value: '48dB', label: 'Lift noise' }, { value: '11s', label: 'Full travel' }, { value: '36mo', label: 'Frame warranty' } ] },
      { eyebrow: 'Lighting', title: 'Light that reaches under the dog.', body: 'Overhead light always casts the same shadow: under the jaw, behind the elbow, along the belly. Exactly where matting hides. The halo is a diffused ring at deck level, so the light arrives from the side and underneath rather than from above.', layout: 'media_left' },
      { eyebrow: 'Frame', title: 'One plate, not eleven welds.', body: 'The base is folded from a single 6 mm sheet. It is heavier and more expensive than a welded tube assembly, and it is the only reason a 45 kg dog shifting its weight does not move the table.', layout: 'media_right' },
    ],
    faqs: [
      { question: 'Will it fit through a standard doorway?', answer: 'Yes. The deck is 610 mm wide and the base is 580 mm, against a standard Indian internal door of 750 mm. The table arrives with the column attached and the deck separate, so the widest single piece through the door is the deck on its edge.' },
      { question: 'Can the rubber surface be replaced?', answer: 'Yes, and it is designed to be. The mat is mechanically retained rather than glued — four screws along each long edge. Replacement mats are stocked as a spare part. Expect to change it every three to four years with daily use.' },
      { question: 'What happens in a power cut?', answer: 'The table holds its position. There is no creep and no slow descent — the actuator is self-locking. You cannot raise or lower it until power returns, so if outages are frequent where you are, look at the Anchor hydraulic range instead.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'apex-e7-electric-grooming-table',
    sku: 'APS-APEX-E7',
    name: 'Apex E7 Electric Grooming Table',
    tagline: 'The flagship, minus the halo.',
    summary: 'The same column, deck and folded-plate base as the E9. No integrated lighting, and about twenty-nine thousand rupees less.',
    description: 'If you already have good task lighting, the halo on the E9 is the one thing you are paying for and not using. The E7 is the same table without it: same 120 kg column, same folded-plate base, same replaceable ribbed deck.\n\nIt is the table we recommend most often to groomers setting up their second station.',
    categorySlug: 'electric-lifting',
    basePrice: 7_890_000, compareAtPrice: 9_800_000,
    weightG: 54_000, lengthMm: 1_220, widthMm: 610, heightMinMm: 540, heightMaxMm: 1_050, loadCapacityKg: 120,
    warrantyMonths: 36, badges: ['Best value'], isFeatured: true, imageCount: 3,
    variants: [
      { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 8, weightG: 54_000, hexColour: '#2B2B2E', skuSuffix: 'GR' },
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 4, weightG: 54_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
    ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Single-column electric actuator' },
      { group: 'Lift', label: 'Height range', value: '540 – 1,050 mm' },
      { group: 'Lift', label: 'Full travel time', value: '11 seconds' },
      { group: 'Lift', label: 'Load capacity', value: '120 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,220 × 610 mm' },
      { group: 'Deck', label: 'Surface', value: '8 mm ribbed natural rubber, replaceable' },
      { group: 'Frame', label: 'Base', value: 'Single folded 6 mm steel plate' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Controls', label: 'Foot control', value: 'Full-width bar, both sides' },
      { group: 'Shipping', label: 'Crated weight', value: '67 kg' },
      { group: 'Warranty', label: 'Term', value: '36 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Same bones', title: 'Everything structural, nothing decorative.', body: 'The column, the base plate, the deck and the foot control are shared with the E9 part for part. What you give up is the integrated halo — which, if you already own a good arm lamp, you were never going to switch on.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '120kg', label: 'Load capacity' }, { value: '11s', label: 'Full travel' }, { value: '1220mm', label: 'Deck length' }, { value: '36mo', label: 'Frame warranty' } ] },
    ],
    faqs: [
      { question: 'Can I add the halo later?', answer: 'No. The halo on the E9 is integrated into the deck substrate and wired through the column; it is not a retrofit. If you want integrated lighting, buy the E9.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'vertex-x-pro-electric-lifting-table',
    sku: 'APS-VTX-XPRO',
    name: 'Vertex X Pro Electric Lifting Table',
    tagline: 'Twin columns, wider deck.',
    summary: 'A 1,270 mm deck on twin synchronised columns, for groomers who work a lot of long-backed breeds.',
    description: 'The X Pro trades the single-column simplicity of the Apex line for a wider, longer deck on two synchronised actuators. If your week is mostly Dachshunds, Corgis and Golden Retrievers lying flat, the extra 50 mm of length earns its keep.',
    categorySlug: 'electric-lifting',
    basePrice: 6_490_000, compareAtPrice: 8_290_000,
    weightG: 49_000, lengthMm: 1_270, widthMm: 640, heightMinMm: 520, heightMaxMm: 1_020, loadCapacityKg: 100,
    warrantyMonths: 24, badges: ['Widest deck'], isFeatured: true, imageCount: 3,
    variants: [
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 5, weightG: 49_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
      { optionName: 'Finish', optionValue: 'Deep Plum', priceDelta: 180_000, stockQty: 2, weightG: 49_000, hexColour: '#4A2545', skuSuffix: 'PP' },
    ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Twin synchronised electric actuators' },
      { group: 'Lift', label: 'Height range', value: '520 – 1,020 mm' },
      { group: 'Lift', label: 'Load capacity', value: '100 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,270 × 640 mm' },
      { group: 'Deck', label: 'Surface', value: '6 mm ribbed rubber' },
      { group: 'Frame', label: 'Base', value: 'H-frame, 50 mm box section' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Shipping', label: 'Crated weight', value: '61 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Deck', title: 'Fifty millimetres you will notice.', body: 'A 1,270 mm deck sounds like a rounding error against 1,220 mm until you are working a long-backed dog and the tail is off the end. Then it is the whole difference.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '1270mm', label: 'Deck length' }, { value: '100kg', label: 'Load capacity' }, { value: '520mm', label: 'Lowest height' } ] },
    ],
    faqs: [
      { question: 'Do twin columns fall out of sync?', answer: 'They are electronically synchronised and re-home themselves whenever you take the table fully down, which corrects any accumulated drift. Take it to its lowest position once a week and you will never think about it.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'vertex-x-electric-lifting-table',
    sku: 'APS-VTX-X',
    name: 'Vertex X Electric Lifting Table',
    tagline: 'The one most people end up buying.',
    summary: 'The middle of the range, and the one we sell most of. 1,220 mm deck, 100 kg, twin columns.',
    description: 'The X is the middle of our range and the one we sell most of. It does not have the folded-plate base of the Apex line or the extra length of the X Pro, and for the overwhelming majority of people neither of those things matters.',
    categorySlug: 'electric-lifting',
    basePrice: 5_840_000, compareAtPrice: 7_490_000,
    weightG: 46_000, lengthMm: 1_220, widthMm: 610, heightMinMm: 520, heightMaxMm: 1_020, loadCapacityKg: 100,
    warrantyMonths: 24, badges: ['Most popular'], isFeatured: true, imageCount: 3,
    variants: [
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 11, weightG: 46_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
      { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 7, weightG: 46_000, hexColour: '#2B2B2E', skuSuffix: 'GR' },
    ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Twin synchronised electric actuators' },
      { group: 'Lift', label: 'Height range', value: '520 – 1,020 mm' },
      { group: 'Lift', label: 'Load capacity', value: '100 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,220 × 610 mm' },
      { group: 'Deck', label: 'Surface', value: '6 mm ribbed rubber' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Shipping', label: 'Crated weight', value: '58 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Why this one', title: 'The boring, correct answer.', body: 'If you want one table that will not let you down and you do not want to think about it again, this is it. Everything above it in the range solves a specific problem. This one solves the general case.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '100kg', label: 'Load capacity' }, { value: '1220mm', label: 'Deck length' }, { value: '24mo', label: 'Frame warranty' } ] },
    ],
    faqs: [ WARRANTY_FAQ, DELIVERY_FAQ ],
  },
  {
    slug: 'vertex-eco-electric-lifting-table',
    sku: 'APS-VTX-ECO',
    name: 'Vertex Eco Electric Lifting Table',
    tagline: 'Electric, without the premium.',
    summary: 'The cheapest way into an electric table that we are willing to put our name on.',
    description: 'The Eco exists because the jump from a hydraulic table to an electric one is a big cheque, and we would rather people made it than stayed on a table that hurts their back.\n\nWhat is different: a lighter gauge in the base, a thinner deck mat, and a 90 kg rating rather than 100 kg. What is not different: the actuator and the controller.',
    categorySlug: 'electric-lifting',
    basePrice: 4_720_000, compareAtPrice: 6_190_000,
    weightG: 41_000, lengthMm: 1_120, widthMm: 600, heightMinMm: 530, heightMaxMm: 980, loadCapacityKg: 90,
    warrantyMonths: 18, badges: ['Entry electric'], isFeatured: false, imageCount: 3,
    variants: [ { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 9, weightG: 41_000, hexColour: '#EDE8E2', skuSuffix: 'WH' } ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Twin synchronised electric actuators' },
      { group: 'Lift', label: 'Height range', value: '530 – 980 mm' },
      { group: 'Lift', label: 'Load capacity', value: '90 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,120 × 600 mm' },
      { group: 'Deck', label: 'Surface', value: '4 mm ribbed rubber' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Shipping', label: 'Crated weight', value: '52 kg' },
      { group: 'Warranty', label: 'Term', value: '18 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Honest positioning', title: 'What we took out, and what we did not.', body: 'The actuator and controller are the same parts used in the Vertex X — those are the components that fail expensively, and we were not willing to downgrade them. The savings come from the base gauge, the mat thickness and a shorter deck.', layout: 'media_left' },
    ],
    faqs: [
      { question: 'Is 90 kg enough?', answer: 'For nearly everyone, yes. The rating is the dog plus whatever you lean on the deck. A 90 kg limit comfortably covers any dog you are likely to groom; if you regularly handle giant breeds, buy the Apex E7 instead and stop thinking about it.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'vertex-z-frame-electric-table',
    sku: 'APS-VTX-Z',
    name: 'Vertex Z-Frame Electric Table',
    tagline: 'Open underneath. Room for your feet.',
    summary: 'A Z-shaped base instead of an H-frame, so you can stand square to the dog without straddling a crossbar.',
    description: 'Every H-frame table has a bar between your feet. You learn to stand around it, and after eleven years of standing around it your hip tells you about it.\n\nThe Z-frame moves the entire support structure to one side. You stand square to the dog, both feet flat, for the whole groom.',
    categorySlug: 'electric-lifting',
    basePrice: 4_960_000, compareAtPrice: 6_400_000,
    weightG: 44_000, lengthMm: 1_170, widthMm: 610, heightMinMm: 510, heightMaxMm: 1_000, loadCapacityKg: 100,
    warrantyMonths: 24, badges: ['Open base'], isFeatured: false, imageCount: 3,
    variants: [ { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 6, weightG: 44_000, hexColour: '#2B2B2E', skuSuffix: 'GR' } ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Single-column electric actuator, offset' },
      { group: 'Lift', label: 'Height range', value: '510 – 1,000 mm' },
      { group: 'Lift', label: 'Load capacity', value: '100 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,170 × 610 mm' },
      { group: 'Frame', label: 'Geometry', value: 'Z-frame, fully open front' },
      { group: 'Frame', label: 'Foot clearance', value: '1,170 mm unobstructed' },
      { group: 'Shipping', label: 'Crated weight', value: '56 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months frame, 12 months electrical' },
    ],
    features: [
      { eyebrow: 'Ergonomics', title: 'Nothing between your feet.', body: 'The support column sits behind the deck rather than beneath it. The entire 1,170 mm front edge is clear, so you stand square, both feet flat, and your weight stays over your hips instead of off to one side.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '1170mm', label: 'Clear foot space' }, { value: '100kg', label: 'Load capacity' }, { value: '510mm', label: 'Lowest height' } ] },
    ],
    faqs: [
      { question: 'Is an offset column less stable?', answer: 'It is a real engineering trade-off and we compensated for it with mass: the base plate is heavier than the equivalent H-frame and extends further back. The table is rated to the same 100 kg. What you will notice is that it is more awkward to move, because the weight is not centred.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'anchor-h5-hydraulic-grooming-table',
    sku: 'APS-ANC-H5',
    name: 'Anchor H5 Hydraulic Grooming Table',
    tagline: 'Nothing to plug in.',
    summary: 'A foot-pump hydraulic ram rated to 110 kg. No cable, no controller, no firmware.',
    description: 'A hydraulic table has one moving system and no electronics. That matters in two situations: when the power is unreliable, and when you are ten years into owning the thing and something needs fixing.\n\nThe H5 lifts 110 kg on roughly nine pumps of the foot pedal, and lowers on a release lever you can feather.',
    categorySlug: 'hydraulic',
    basePrice: 3_840_000, compareAtPrice: 4_900_000,
    weightG: 43_000, lengthMm: 1_170, widthMm: 610, heightMinMm: 560, heightMaxMm: 980, loadCapacityKg: 110,
    warrantyMonths: 24, badges: ['No power needed'], isFeatured: true, imageCount: 3,
    variants: [ { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 7, weightG: 43_000, hexColour: '#2B2B2E', skuSuffix: 'GR' } ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Foot-pump hydraulic ram' },
      { group: 'Lift', label: 'Height range', value: '560 – 980 mm' },
      { group: 'Lift', label: 'Pumps to full height', value: '9 (unloaded)' },
      { group: 'Lift', label: 'Load capacity', value: '110 kg' },
      { group: 'Lift', label: 'Descent', value: 'Feathered release lever' },
      { group: 'Deck', label: 'Dimensions', value: '1,170 × 610 mm' },
      { group: 'Deck', label: 'Rotation', value: '360° with lock' },
      { group: 'Frame', label: 'Base', value: 'Cast steel, 5-star' },
      { group: 'Shipping', label: 'Crated weight', value: '55 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Simplicity', title: 'One moving system. No firmware.', body: 'There is no controller to fail, no cable to trip over, and no behaviour that changes after a decade. When a hydraulic ram eventually weeps, it is a seal kit and an afternoon — not a replacement actuator ordered from overseas.', layout: 'media_right' },
      { eyebrow: 'Rotation', title: 'Turn the dog, not yourself.', body: 'The deck rotates a full 360° on a locking collar. Release, turn, lock. You work the far side without walking around the table or asking a settled dog to reposition.', layout: 'media_left' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '110kg', label: 'Load capacity' }, { value: '360°', label: 'Deck rotation' }, { value: '0W', label: 'Power draw' } ] },
    ],
    faqs: [
      { question: 'How does it compare to electric for daily use?', answer: 'Electric is faster and requires nothing of you. Hydraulic costs you nine pumps per height change, which over a full day is real physical work. Buy hydraulic for reliability and independence from mains power; buy electric if you are doing eight dogs a day.' },
      WARRANTY_FAQ, DELIVERY_FAQ,
    ],
  },
  {
    slug: 'anchor-h3-hydraulic-grooming-table',
    sku: 'APS-ANC-H3',
    name: 'Anchor H3 Hydraulic Grooming Table',
    tagline: 'Compact hydraulic.',
    summary: 'A shorter deck and a 90 kg rating, for small breeds and tight rooms.',
    description: 'The H3 is the H5 scaled down for groomers who work small breeds in a small room. Same ram, same 360° rotation, 1,020 mm deck.',
    categorySlug: 'hydraulic',
    basePrice: 2_990_000, compareAtPrice: 3_850_000,
    weightG: 36_000, lengthMm: 1_020, widthMm: 560, heightMinMm: 540, heightMaxMm: 930, loadCapacityKg: 90,
    warrantyMonths: 24, badges: [], isFeatured: false, imageCount: 3,
    variants: [ { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 0, weightG: 36_000, hexColour: '#2B2B2E', skuSuffix: 'GR' } ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Foot-pump hydraulic ram' },
      { group: 'Lift', label: 'Height range', value: '540 – 930 mm' },
      { group: 'Lift', label: 'Load capacity', value: '90 kg' },
      { group: 'Deck', label: 'Dimensions', value: '1,020 × 560 mm' },
      { group: 'Deck', label: 'Rotation', value: '360° with lock' },
      { group: 'Shipping', label: 'Crated weight', value: '47 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Footprint', title: 'Built for the room you actually have.', body: 'A 1,020 mm deck and a 560 mm base. If your grooming room is a converted bedroom or a corner of a pet shop, this is the hydraulic that fits.', layout: 'media_right' },
    ],
    faqs: [ WARRANTY_FAQ, DELIVERY_FAQ ],
  },
  {
    slug: 'stride-adjustable-portable-table',
    sku: 'APS-STR-ADJ',
    name: 'Stride Adjustable Portable Table',
    tagline: 'Height-adjustable, and it still goes in the car.',
    summary: 'Four-position legs from 690 to 900 mm, 18 kg, folds flat. For mobile groomers who are tired of working at one fixed height.',
    description: 'Most portable tables have one height, and it is the wrong one for at least half the dogs you see. The Stride Adjustable has four leg positions across a 210 mm range, set independently at each corner so you can also level it on a sloping driveway.',
    categorySlug: 'portable',
    basePrice: 1_540_000, compareAtPrice: 2_000_000,
    weightG: 18_000, lengthMm: 910, widthMm: 530, heightMinMm: 690, heightMaxMm: 900, loadCapacityKg: 70,
    warrantyMonths: 12, badges: ['Mobile favourite'], isFeatured: false, imageCount: 3,
    variants: [
      { optionName: 'Size', optionValue: 'Medium — 910 mm', priceDelta: 0, stockQty: 14, weightG: 18_000, skuSuffix: 'M' },
      { optionName: 'Size', optionValue: 'Large — 1,070 mm', priceDelta: 260_000, stockQty: 6, weightG: 21_000, skuSuffix: 'L' },
    ],
    specs: [
      { group: 'Lift', label: 'Mechanism', value: 'Four-position telescopic legs' },
      { group: 'Lift', label: 'Height range', value: '690 – 900 mm, 70 mm steps' },
      { group: 'Lift', label: 'Load capacity', value: '70 kg' },
      { group: 'Deck', label: 'Dimensions', value: '910 × 530 mm' },
      { group: 'Deck', label: 'Surface', value: '4 mm ribbed rubber over ply' },
      { group: 'Portability', label: 'Weight', value: '18 kg' },
      { group: 'Portability', label: 'Folded depth', value: '95 mm' },
      { group: 'Frame', label: 'Legs', value: 'Anodised aluminium, 38 mm' },
      { group: 'Warranty', label: 'Term', value: '12 months' },
    ],
    features: [
      { eyebrow: 'Height', title: 'Four heights, set corner by corner.', body: 'Each leg locks independently, which means two things: you can pick a working height that suits the dog, and you can level the table on a driveway that is not flat. Mobile groomers spend more time on uneven ground than anyone admits.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '18kg', label: 'Carry weight' }, { value: '95mm', label: 'Folded depth' }, { value: '70kg', label: 'Load capacity' } ] },
    ],
    faqs: [
      { question: 'Will it fit in a hatchback?', answer: 'Folded it is 910 × 530 × 95 mm, which lies flat in the boot of a Swift or an i20 with the rear seats up. The Large version at 1,070 mm needs one rear seat folded.' },
      WARRANTY_FAQ,
    ],
  },
  {
    slug: 'stride-air-ultralight-table-medium',
    sku: 'APS-STR-AIR-M',
    name: 'Stride Air Ultra-Light Table — Medium',
    tagline: '11 kg. One hand.',
    summary: 'Our lightest full-size table. Aluminium throughout, carried in one hand, set up in under a minute.',
    description: 'The Air is built for groomers who carry a table up a flight of stairs to a client’s flat. At 11 kg it is light enough to carry in one hand while the other holds a kit bag.\n\nThe compromise is honest: a 55 kg rating and a fixed 760 mm height.',
    categorySlug: 'portable',
    basePrice: 1_290_000, compareAtPrice: 1_700_000,
    weightG: 11_000, lengthMm: 860, widthMm: 500, heightMinMm: 760, heightMaxMm: 760, loadCapacityKg: 55,
    warrantyMonths: 12, badges: ['Lightest'], isFeatured: false, imageCount: 3,
    variants: [
      { optionName: 'Colour', optionValue: 'Silver', priceDelta: 0, stockQty: 18, weightG: 11_000, hexColour: '#C9CCD1', skuSuffix: 'SV' },
      { optionName: 'Colour', optionValue: 'Deep Plum', priceDelta: 0, stockQty: 9, weightG: 11_000, hexColour: '#4A2545', skuSuffix: 'PP' },
    ],
    specs: [
      { group: 'Portability', label: 'Weight', value: '11 kg' },
      { group: 'Portability', label: 'Folded depth', value: '80 mm' },
      { group: 'Portability', label: 'Setup time', value: 'Under 60 seconds' },
      { group: 'Deck', label: 'Dimensions', value: '860 × 500 mm' },
      { group: 'Deck', label: 'Height', value: '760 mm fixed' },
      { group: 'Lift', label: 'Load capacity', value: '55 kg' },
      { group: 'Frame', label: 'Material', value: 'Anodised aluminium throughout' },
      { group: 'Warranty', label: 'Term', value: '12 months' },
    ],
    features: [
      { eyebrow: 'Weight', title: 'Eleven kilograms, up three flights.', body: 'Aluminium everywhere it can be, which is everywhere. You can carry it in one hand with a kit bag in the other, which is the actual test of a portable table.', layout: 'media_right' },
      { eyebrow: 'The trade-off', title: 'What 11 kg costs you.', body: 'A 55 kg load rating and one fixed height. This is a small-and-medium-breed table for house calls. If you need to put a Labrador on it, buy the Stride Adjustable.', layout: 'media_left' },
    ],
    faqs: [
      { question: 'Can I groom a large dog on it?', answer: 'No, and please do not try. The 55 kg rating is the structural limit, not a suggestion. For large breeds use the Stride Adjustable at 70 kg, or a fixed table.' },
      WARRANTY_FAQ,
    ],
  },
  {
    slug: 'stride-air-ultralight-table-small',
    sku: 'APS-STR-AIR-S',
    name: 'Stride Air Ultra-Light Table — Small',
    tagline: 'For toy breeds and tight boots.',
    summary: 'A 710 mm deck at 9 kg. The table for groomers who only ever see small dogs.',
    description: 'Same construction as the Medium, scaled to a 710 mm deck and 9 kg. If your book is Shih Tzus, Pomeranians and Indie pups, the extra deck length on the Medium is weight you carry for nothing.',
    categorySlug: 'portable',
    basePrice: 990_000, compareAtPrice: 1_300_000,
    weightG: 9_000, lengthMm: 710, widthMm: 460, heightMinMm: 760, heightMaxMm: 760, loadCapacityKg: 40,
    warrantyMonths: 12, badges: [], isFeatured: false, imageCount: 2,
    variants: [ { optionName: 'Colour', optionValue: 'Silver', priceDelta: 0, stockQty: 22, weightG: 9_000, hexColour: '#C9CCD1', skuSuffix: 'SV' } ],
    specs: [
      { group: 'Portability', label: 'Weight', value: '9 kg' },
      { group: 'Deck', label: 'Dimensions', value: '710 × 460 mm' },
      { group: 'Deck', label: 'Height', value: '760 mm fixed' },
      { group: 'Lift', label: 'Load capacity', value: '40 kg' },
      { group: 'Frame', label: 'Material', value: 'Anodised aluminium throughout' },
      { group: 'Warranty', label: 'Term', value: '12 months' },
    ],
    features: [
      { eyebrow: 'Sizing', title: 'Do not carry deck you never use.', body: 'If the largest dog in your book is 12 kg, a 910 mm deck is 2 kg of aluminium you lift in and out of a car every day for no reason.', layout: 'media_right' },
    ],
    faqs: [ WARRANTY_FAQ ],
  },
  {
    slug: 'fold-pro-stainless-folding-table',
    sku: 'APS-FLD-PRO',
    name: 'Fold Pro Stainless Folding Table',
    tagline: 'Folds flat. Does not rust.',
    summary: 'Stainless legs and a sealed deck, for wet rooms and groomers who bathe and dry on the same table.',
    description: 'Powder-coated steel legs are fine until you work wet. Then the coating chips, water finds the steel, and eighteen months later there is rust blooming around every fixing.\n\nThe Fold Pro uses 304 stainless legs and a fully sealed deck edge. It costs more than the Fold Lite and it is the right answer if water is part of your day.',
    categorySlug: 'foldable',
    basePrice: 1_160_000, compareAtPrice: 1_500_000,
    weightG: 16_000, lengthMm: 910, widthMm: 530, heightMinMm: 800, heightMaxMm: 800, loadCapacityKg: 80,
    warrantyMonths: 24, badges: ['Wet-room rated'], isFeatured: false, imageCount: 3,
    variants: [
      { optionName: 'Size', optionValue: 'Medium — 910 mm', priceDelta: 0, stockQty: 12, weightG: 16_000, skuSuffix: 'M' },
      { optionName: 'Size', optionValue: 'Large — 1,070 mm', priceDelta: 240_000, stockQty: 0, weightG: 19_000, skuSuffix: 'L' },
    ],
    specs: [
      { group: 'Frame', label: 'Legs', value: '304 stainless steel, 32 mm' },
      { group: 'Frame', label: 'Folding', value: 'Scissor, single-action' },
      { group: 'Deck', label: 'Dimensions', value: '910 × 530 mm' },
      { group: 'Deck', label: 'Height', value: '800 mm fixed' },
      { group: 'Deck', label: 'Edge', value: 'Fully sealed, no water ingress' },
      { group: 'Lift', label: 'Load capacity', value: '80 kg' },
      { group: 'Portability', label: 'Folded depth', value: '110 mm' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Corrosion', title: 'Where powder coat gives up.', body: 'A chipped coating on a steel leg is a rust site. Stainless has no coating to chip. If you bathe, dry and groom on the same surface, this is the difference between a table that lasts two years and one that lasts ten.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '304', label: 'Stainless grade' }, { value: '80kg', label: 'Load capacity' }, { value: '110mm', label: 'Folded depth' } ] },
    ],
    faqs: [
      { question: 'Can I hose it down?', answer: 'Yes. The deck edge is sealed and the legs are stainless. Avoid a pressure washer directly at the deck seam — it will eventually force water past any seal — but a hose and a cloth is exactly what this table is for.' },
      WARRANTY_FAQ,
    ],
  },
  {
    slug: 'fold-lite-folding-table',
    sku: 'APS-FLD-LITE',
    name: 'Fold Lite Folding Table',
    tagline: 'The honest starter table.',
    summary: 'A dry-room folding table at a price that makes sense for a first table or a second station.',
    description: 'Powder-coated steel legs, a ribbed deck and a scissor fold. It is not corrosion-proof and it does not adjust. It is a solid, rigid, fairly priced table for dry grooming, and it is a far better first purchase than a wobbly folding trestle.',
    categorySlug: 'foldable',
    basePrice: 890_000, compareAtPrice: 1_150_000,
    weightG: 14_000, lengthMm: 810, widthMm: 500, heightMinMm: 780, heightMaxMm: 780, loadCapacityKg: 60,
    warrantyMonths: 12, badges: ['Starter'], isFeatured: false, imageCount: 2,
    variants: [ { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 25, weightG: 14_000, hexColour: '#2B2B2E', skuSuffix: 'GR' } ],
    specs: [
      { group: 'Frame', label: 'Legs', value: 'Powder-coated steel, 30 mm' },
      { group: 'Frame', label: 'Folding', value: 'Scissor, single-action' },
      { group: 'Deck', label: 'Dimensions', value: '810 × 500 mm' },
      { group: 'Deck', label: 'Height', value: '780 mm fixed' },
      { group: 'Lift', label: 'Load capacity', value: '60 kg' },
      { group: 'Warranty', label: 'Term', value: '12 months' },
    ],
    features: [
      { eyebrow: 'Positioning', title: 'What it is, plainly.', body: 'A dry-room table. Do not bathe on it, do not leave it wet. Within those limits it is rigid, flat and will outlast three trestle tables.', layout: 'media_right' },
    ],
    faqs: [ WARRANTY_FAQ ],
  },
  {
    slug: 'orbit-r-round-rotating-table',
    sku: 'APS-ORB-R',
    name: 'Orbit R Round Rotating Grooming Table',
    tagline: 'It turns. You do not.',
    summary: 'A 760 mm circular deck that spins a full 360° on a single pedestal. The table most people should buy, whatever room it goes in.',
    description: 'A rectangular table has four corners you walk around. A round one has none: you stand in one place, unlock the collar, bring the far side of the dog to your hand, and lock it again.\n\nThat sounds like a small thing until you count how many times you do it. On a full groom it is thirty or forty repositions, and on a rectangular table every one of them is either two steps sideways or asking a settled dog to move.\n\nThe pedestal is the other half of the argument. One column in the middle means no legs to kick, a footprint of 620 mm, and a table you can push into the corner of an ordinary room.',
    categorySlug: 'round-rotating',
    basePrice: 2_700_000, compareAtPrice: 3_400_000,
    weightG: 34_000, lengthMm: 760, widthMm: 760, heightMinMm: 570, heightMaxMm: 960, loadCapacityKg: 80,
    warrantyMonths: 24, badges: ['Rotates 360°', 'Best seller'], isFeatured: true, imageCount: 4, imageExt: 'svg',
    variants: [
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 12, weightG: 34_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
      { optionName: 'Finish', optionValue: 'Graphite', priceDelta: 0, stockQty: 8, weightG: 34_000, hexColour: '#2B2B2E', skuSuffix: 'GR' },
    ],
    specs: [
      { group: 'Deck', label: 'Shape', value: 'Round, 760 mm diameter' },
      { group: 'Deck', label: 'Surface', value: '6 mm ribbed rubber, replaceable' },
      { group: 'Deck', label: 'Rotation', value: '360°, positive collar lock' },
      { group: 'Lift', label: 'Mechanism', value: 'Electric column' },
      { group: 'Lift', label: 'Load capacity', value: '80 kg' },
      { group: 'Frame', label: 'Base', value: 'Five-star cast pedestal, 620 mm' },
      { group: 'Frame', label: 'Footprint', value: '620 mm — smallest in the range' },
      { group: 'Included', label: 'Grooming arm', value: 'Yes, with single noose' },
      { group: 'Power', label: 'Input', value: '220–240 V, 50 Hz' },
      { group: 'Shipping', label: 'Crated weight', value: '43 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'The point of round', title: 'Thirty fewer steps per dog.', body: 'Count the repositions on your next full groom. Every one of them on a rectangular table is two steps sideways, or a settled dog asked to stand up again. On a round deck it is a wrist movement.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '760mm', label: 'Deck diameter' }, { value: '360°', label: 'Rotation' }, { value: '620mm', label: 'Footprint' }, { value: '80kg', label: 'Load capacity' } ] },
      { eyebrow: 'Pedestal', title: 'One column. No legs to kick.', body: 'A five-star cast base puts the mass where it belongs and leaves the floor around the table clear. It is also why this is the table that fits in an ordinary room rather than needing a dedicated one.', layout: 'media_left' },
    ],
    faqs: [
      { question: 'Is a round deck big enough for a large dog?', answer: 'For most, yes — 760 mm across takes a Cocker or a Border Collie comfortably. A long-backed breed lying fully flat, a Dachshund or a large Retriever, is better on a rectangular deck; look at the Vertex X Pro at 1,270 mm instead. As a rule: if the dog stands to be groomed, round works. If it lies down, go rectangular.' },
      { question: 'Does the arm rotate with the deck?', answer: 'No, and deliberately. The arm is mounted to the column, not the deck, so the noose stays exactly where it is while the dog turns beneath it. An arm that rotated with the deck would wind the noose around the dog.' },
    ],
  },
  {
    slug: 'orbit-r-mini-round-table',
    sku: 'APS-ORB-MINI',
    name: 'Orbit R Mini Round Table',
    tagline: 'For small breeds and small rooms.',
    summary: 'A 610 mm round deck at a height you set by hand. The cheapest way into a rotating table, and the one most home groomers actually need.',
    description: 'The Mini is the Orbit R scaled down for people grooming one or two small dogs, usually at home.\n\nWhat changes: a 610 mm deck instead of 760 mm, a hand-set height instead of a powered column, and a 45 kg rating. What does not change: the rotating deck, the pedestal base, and the arm.\n\nIf your dog is under 15 kg and you groom it yourself, this is the table to buy. Spending three times more buys you a powered column you would use twice a month.',
    categorySlug: 'round-rotating',
    basePrice: 2_140_000, compareAtPrice: 2_700_000,
    weightG: 21_000, lengthMm: 610, widthMm: 610, heightMinMm: 640, heightMaxMm: 860, loadCapacityKg: 45,
    warrantyMonths: 18, badges: ['Home favourite'], isFeatured: false, imageCount: 4, imageExt: 'svg',
    variants: [
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 16, weightG: 21_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
    ],
    specs: [
      { group: 'Deck', label: 'Shape', value: 'Round, 610 mm diameter' },
      { group: 'Deck', label: 'Rotation', value: '360°, positive collar lock' },
      { group: 'Lift', label: 'Mechanism', value: 'Hand-set collar, 4 positions' },
      { group: 'Lift', label: 'Load capacity', value: '45 kg' },
      { group: 'Frame', label: 'Base', value: 'Five-star cast pedestal, 540 mm' },
      { group: 'Included', label: 'Grooming arm', value: 'Yes, with single noose' },
      { group: 'Shipping', label: 'Crated weight', value: '27 kg' },
      { group: 'Warranty', label: 'Term', value: '18 months' },
    ],
    features: [
      { eyebrow: 'Sizing honestly', title: 'Buy this one if your dog is under 15 kg.', body: 'A powered column is worth paying for when you raise and lower it forty times a day. At home, twice a month, it is a motor you are buying to admire. The Mini puts the money into the deck and the rotation instead — the two things you actually use.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '610mm', label: 'Deck diameter' }, { value: '45kg', label: 'Load capacity' }, { value: '21kg', label: 'Table weight' } ] },
    ],
    faqs: [
      { question: 'Can I move it between rooms?', answer: 'It is 21 kg, so it lifts — awkwardly, with two hands, and not up stairs regularly. If you need to carry a table often, the Stride Air at 11 kg is the honest answer, though you give up the rotating deck to get there.' },
    ],
  },
  {
    slug: 'orbit-r-led-round-table',
    sku: 'APS-ORB-LED',
    name: 'Orbit R LED Round Table',
    tagline: 'Round, powered, and lit from the rim.',
    summary: 'The Orbit R with a diffused LED ring set into the deck edge, so the light turns with the dog.',
    description: 'A lamp on an arm lights the dog from one direction, and you spend the groom working around its shadow. A ring set into the deck edge lights it from every direction at once — and because it is in the deck, it turns with the dog.\n\nEverything else is the standard Orbit R: 760 mm deck, 360° collar, electric column, five-star pedestal.',
    categorySlug: 'round-rotating',
    basePrice: 3_890_000, compareAtPrice: 4_900_000,
    weightG: 37_000, lengthMm: 760, widthMm: 760, heightMinMm: 570, heightMaxMm: 960, loadCapacityKg: 80,
    warrantyMonths: 24, badges: ['LED rim'], isFeatured: false, imageCount: 4, imageExt: 'svg',
    variants: [
      { optionName: 'Finish', optionValue: 'Bone White', priceDelta: 0, stockQty: 5, weightG: 37_000, hexColour: '#EDE8E2', skuSuffix: 'WH' },
    ],
    specs: [
      { group: 'Deck', label: 'Shape', value: 'Round, 760 mm diameter' },
      { group: 'Deck', label: 'Rotation', value: '360°, positive collar lock' },
      { group: 'Lighting', label: 'Type', value: 'Diffused LED rim, 4,000 K' },
      { group: 'Lighting', label: 'Output', value: '1,800 lm, stepless dimming' },
      { group: 'Lift', label: 'Mechanism', value: 'Electric column' },
      { group: 'Lift', label: 'Load capacity', value: '80 kg' },
      { group: 'Frame', label: 'Base', value: 'Five-star cast pedestal, 620 mm' },
      { group: 'Shipping', label: 'Crated weight', value: '46 kg' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Lighting', title: 'The light turns with the dog.', body: 'An arm lamp throws one shadow and you work around it all groom. A rim set into the deck throws none — and because it rotates with the deck, the side you have just brought round is already lit.', layout: 'media_left' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '1,800lm', label: 'Output' }, { value: '4,000K', label: 'Colour' }, { value: '360°', label: 'Rotation' } ] },
    ],
    faqs: [
      { question: 'Does the rim get warm under a dog?', answer: 'No. It draws 22 W and is set behind a diffuser in the deck edge, not under the surface the dog stands on. You can hold it at full output indefinitely.' },
    ],
  },
  {
    slug: 'precision-grooming-arm-double-noose',
    sku: 'APS-ACC-ARM',
    name: 'Precision Grooming Arm with Double Noose',
    tagline: 'Clamps to anything. Does not creep.',
    summary: 'A 900 mm stainless arm with a cam clamp that holds under load, plus two adjustable nooses.',
    description: 'Most grooming arms fail the same way: the clamp is a wing nut, the wing nut loosens under vibration, and by the third dog the arm has crept 40 mm down the table edge.\n\nThis one uses a cam lever against a steel saddle. It either holds or it does not, and it holds.',
    categorySlug: 'accessories',
    basePrice: 420_000, compareAtPrice: 560_000,
    weightG: 2_400, lengthMm: 900, widthMm: 60, heightMinMm: 0, heightMaxMm: 900, loadCapacityKg: 15,
    warrantyMonths: 24, badges: [], isFeatured: false, imageCount: 2,
    variants: [ { optionName: 'Length', optionValue: '900 mm', priceDelta: 0, stockQty: 34, weightG: 2_400, skuSuffix: '900' } ],
    specs: [
      { group: 'Arm', label: 'Length', value: '900 mm' },
      { group: 'Arm', label: 'Material', value: '304 stainless, 19 mm' },
      { group: 'Clamp', label: 'Type', value: 'Cam lever against steel saddle' },
      { group: 'Clamp', label: 'Jaw range', value: '18 – 60 mm' },
      { group: 'Noose', label: 'Included', value: '2 × adjustable, nylon-sheathed' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Clamp', title: 'Cam lever, not a wing nut.', body: 'A wing nut relies on friction you apply by hand and lose to vibration. A cam lever applies a fixed, repeatable force every time you close it. The arm does not creep down the table edge over a working day.', layout: 'media_right' },
    ],
    faqs: [
      { question: 'Will it fit my table?', answer: 'The jaw opens from 18 to 60 mm, which covers every table in this catalogue and almost every grooming table sold in India. Measure the thickness of your deck edge; if it is under 60 mm, it fits.' },
    ],
  },
  {
    slug: 'non-slip-ramp-for-electric-tables',
    sku: 'APS-ACC-RAMP',
    name: 'Non-Slip Ramp for Electric Tables',
    tagline: 'Stop lifting the dog.',
    summary: 'A folding 1,500 mm ramp rated to 90 kg, so large and elderly dogs walk on instead of being lifted.',
    description: 'Lifting a 40 kg dog onto a table, eight times a day, is the single most common way groomers injure their backs. A ramp removes the lift entirely.\n\nThis one folds in half, hooks over the deck edge of any table in our electric range at its lowest position, and has a ribbed rubber tread that stays grippy wet.',
    categorySlug: 'accessories',
    basePrice: 680_000, compareAtPrice: 890_000,
    weightG: 7_200, lengthMm: 1_500, widthMm: 400, heightMinMm: 0, heightMaxMm: 0, loadCapacityKg: 90,
    warrantyMonths: 24, badges: ['Back-saver'], isFeatured: false, imageCount: 2,
    variants: [ { optionName: 'Length', optionValue: '1,500 mm', priceDelta: 0, stockQty: 16, weightG: 7_200, skuSuffix: '1500' } ],
    specs: [
      { group: 'Ramp', label: 'Length', value: '1,500 mm, folds to 760 mm' },
      { group: 'Ramp', label: 'Width', value: '400 mm' },
      { group: 'Ramp', label: 'Load capacity', value: '90 kg' },
      { group: 'Ramp', label: 'Tread', value: 'Ribbed rubber, wet-rated' },
      { group: 'Ramp', label: 'Weight', value: '7.2 kg' },
      { group: 'Fitting', label: 'Attachment', value: 'Hooked lip, deck edge up to 60 mm' },
      { group: 'Warranty', label: 'Term', value: '24 months' },
    ],
    features: [
      { eyebrow: 'Why', title: 'The injury nobody plans for.', body: 'Eight lifts a day at 30 kg is 240 kg through a bent back, every working day. Groomers do not leave the trade because of one dramatic injury; they leave because of that arithmetic. A ramp is the cheapest insurance in the catalogue.', layout: 'media_right' },
      { title: 'By the numbers', layout: 'stat_row', stats: [ { value: '90kg', label: 'Load capacity' }, { value: '1500mm', label: 'Extended length' }, { value: '7.2kg', label: 'Own weight' } ] },
    ],
    faqs: [
      { question: 'Will a nervous dog actually use it?', answer: 'Most will, with a week of patient introduction and treats at the top. The ribbed tread matters here — a dog that slips once on a ramp will refuse it thereafter, which is why we specified rubber rather than grip tape.' },
    ],
  },
];

/* ───────────────────────────────────────────────────────────────────────────
   Shared capability content

   Three things sell a grooming table and were missing from the per-product copy
   above: how far it travels up and down, whether the deck rotates, and what it
   does for the person actually using it. Rather than repeat
   that prose fifteen times, it is attached here based on what each model can
   actually do.

   NOTE: the rotation fitment below is a starting assumption. Confirm which
   models genuinely ship with a rotating deck before this goes live.
   ─────────────────────────────────────────────────────────────────────────── */

/** Models with a 360° locking deck. */
const ROTATING = new Set([
  /* The Orbit R range is round and already leads with rotation in its own copy,
     so it is deliberately absent here — it would otherwise get the block twice. */
  'apex-e9-electric-grooming-table',
  'apex-e7-electric-grooming-table',
  'vertex-x-pro-electric-lifting-table',
  'vertex-x-electric-lifting-table',
  'vertex-z-frame-electric-table',
  'anchor-h5-hydraulic-grooming-table',
  'anchor-h3-hydraulic-grooming-table',
]);

/** Models whose height is adjustable at all — powered, pumped or pinned. */
function liftKind(p: SeedProduct): 'electric' | 'hydraulic' | 'manual' | null {
  if (p.categorySlug === 'electric-lifting') return 'electric';
  if (p.categorySlug === 'hydraulic') return 'hydraulic';
  if (p.heightMaxMm !== null && p.heightMinMm !== null && p.heightMaxMm > p.heightMinMm) return 'manual';
  return null;
}

function heightFeature(p: SeedProduct): SeedFeature | null {
  const kind = liftKind(p);
  if (!kind) return null;

  const travel = (p.heightMaxMm ?? 0) - (p.heightMinMm ?? 0);
  const how = kind === 'electric'
    ? 'A tap of the foot bar takes it there. You never take a hand off the dog.'
    : kind === 'hydraulic'
      ? 'A few strokes of the foot pump take it up; a lever feathers it back down.'
      : 'Four leg positions, set by hand, each one locking positively.';

  return {
    eyebrow: 'Up and down',
    title: `${travel} mm of travel, so the dog comes to you.`,
    body:
      `From ${p.heightMinMm} mm to ${p.heightMaxMm} mm. ${how}\n\n` +
      'That range is the whole point. Low enough that an arthritic Labrador walks on ' +
      'instead of being lifted, and high enough that you work a Pomeranian standing ' +
      'upright rather than bent double over it. The right working height is different ' +
      'for every dog and every job, and a fixed table only ever gets it right by accident.',
    layout: 'media_left',
    stats: [
      { value: `${p.heightMinMm}mm`, label: 'Lowest' },
      { value: `${p.heightMaxMm}mm`, label: 'Highest' },
      { value: `${travel}mm`, label: 'Total travel' },
    ],
  };
}

const ROTATION_FEATURE: SeedFeature = {
  eyebrow: 'Rotation',
  title: 'Turn the dog, not yourself.',
  body:
    'The deck rotates a full 360° on a locking collar. Release it, turn the dog to ' +
    'where you need it, lock it again.\n\n' +
    'Without rotation you walk around the table, or you ask a settled dog to ' +
    'reposition itself — and a dog that has just settled rarely settles twice. ' +
    'Being able to bring the far shoulder round to your scissor hand is the ' +
    'difference between one calm groom and three interrupted ones.',
  layout: 'media_right',
  stats: [
    { value: '360°', label: 'Rotation' },
    { value: 'Lock', label: 'At any angle' },
  ],
};

const HOME_FEATURE: SeedFeature = {
  eyebrow: 'At home',
  title: 'It is easier than what you do now.',
  body:
    'Most people groom their own dog on the floor, on a bed, or in the bath, and ' +
    'their back pays for it. A table fixes three things at once: the dog is at your ' +
    'height so you stand straight, the ribbed surface and the noose stop it walking ' +
    'off mid-clip, and the dog learns that this surface means grooming — which is ' +
    'most of the battle with a puppy.\n\n' +
    'A home groomer uses a table perhaps twice a month. That is still a decade of ' +
    'brushing, nail trims, drying after wet walks and checking paws — all of it ' +
    'easier, and none of it on your knees.',
  layout: 'media_full',
  stats: [],
};

const HOME_FAQ: SeedFaq = {
  question: 'Is this worth it for one dog at home?',
  answer:
    'If you groom your own dog more than a few times a year, yes — mostly for your back. ' +
    'Brushing a dog on the floor puts you in a bent posture for twenty minutes at a time, ' +
    'and that is what people feel in their forties. The secondary benefit is behavioural: ' +
    'a dog that is always groomed in the same place, at the same height, settles for it ' +
    'far faster than one you chase around a living room. If you only groom occasionally, ' +
    'look at the Stride and Fold ranges rather than an electric table — they cost a ' +
    'fraction and store flat against a wall.',
};

const ROTATION_FAQ: SeedFaq = {
  question: 'Does the rotating deck lock firmly?',
  answer:
    'Yes. The collar is a positive lock, not friction — it either engages or it does not, ' +
    'and you can feel which. A locked deck will not creep under a 40 kg dog shifting its ' +
    'weight. Unlock, turn, lock: about two seconds, one hand.',
};

/* Attach the shared content. Height first (it is the headline capability),
   then rotation, then the home case, then the existing model-specific blocks —
   so every product page opens by explaining what the table actually does. */
for (const product of PRODUCTS) {
  const shared: SeedFeature[] = [];

  const height = heightFeature(product);
  if (height) shared.push(height);
  if (ROTATING.has(product.slug)) shared.push(ROTATION_FEATURE);

  product.features = [...shared, ...product.features, HOME_FEATURE];

  if (ROTATING.has(product.slug)) {
    product.specs.push({ group: 'Deck', label: 'Rotation', value: '360° with positive lock' });
    product.faqs.splice(product.faqs.length - 1, 0, ROTATION_FAQ);
  }

  const travel = (product.heightMaxMm ?? 0) - (product.heightMinMm ?? 0);
  if (travel > 0 && !product.specs.some((s) => s.label === 'Height range')) {
    product.specs.push({
      group: 'Lift',
      label: 'Height range',
      value: `${product.heightMinMm} – ${product.heightMaxMm} mm`,
    });
  }

  product.faqs.push(HOME_FAQ);
}
