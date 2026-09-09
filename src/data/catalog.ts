import catVegetables from "@/assets/cat-vegetables.jpg";
import catFruits from "@/assets/cat-fruits.jpg";
import catRice from "@/assets/cat-rice.jpg";
import catPulses from "@/assets/cat-pulses.jpg";
import catEggs from "@/assets/cat-eggs.jpg";
import catSpices from "@/assets/cat-spices.jpg";
import catGrains from "@/assets/cat-grains.jpg";
import catDryFruits from "@/assets/cat-dry-fruits.jpg";
import catNutsSeeds from "@/assets/cat-nuts-seeds.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catFrozen from "@/assets/cat-frozen.jpg";
import catOther from "@/assets/cat-other.jpg";
import productBasmati from "@/assets/product-basmati.jpg";
import productMango from "@/assets/product-mango.jpg";
import galVegOnions from "@/assets/gal-veg-onions.jpg";
import galVegTomato from "@/assets/gal-veg-tomato.jpg";
import galVegChilli from "@/assets/gal-veg-chilli.jpg";
import galFruitMango from "@/assets/gal-fruit-mango.jpg";
import galFruitPomegranate from "@/assets/gal-fruit-pomegranate.jpg";
import galFruitBanana from "@/assets/gal-fruit-banana.jpg";
import galRiceBasmati from "@/assets/gal-rice-basmati.jpg";
import galRiceMill from "@/assets/gal-rice-mill.jpg";
import galRiceBags from "@/assets/gal-rice-bags.jpg";
import galPulsesDals from "@/assets/gal-pulses-dals.jpg";
import galPulsesChickpeas from "@/assets/gal-pulses-chickpeas.jpg";
import galPulsesBeans from "@/assets/gal-pulses-beans.jpg";
import galEggsCartons from "@/assets/gal-eggs-cartons.jpg";
import galEggsFarm from "@/assets/gal-eggs-farm.jpg";
import galEggsBrown from "@/assets/gal-eggs-brown.jpg";
import galSpicesTurmeric from "@/assets/gal-spices-turmeric.jpg";
import galSpicesMarket from "@/assets/gal-spices-market.jpg";
import galSpicesPepper from "@/assets/gal-spices-pepper.jpg";
import galGrainsWheat from "@/assets/gal-grains-wheat.jpg";
import galGrainsSacks from "@/assets/gal-grains-sacks.jpg";
import galGrainsSilo from "@/assets/gal-grains-silo.jpg";
import galDryFruitsMix from "@/assets/gal-dryfruits-mix.jpg";
import galDryFruitsDates from "@/assets/gal-dryfruits-dates.jpg";
import galDryFruitsRaisins from "@/assets/gal-dryfruits-raisins.jpg";
import galNutsWalnuts from "@/assets/gal-nuts-walnuts.jpg";
import galNutsSesame from "@/assets/gal-nuts-sesame.jpg";
import galNutsSacks from "@/assets/gal-nuts-sacks.jpg";
import galOilsBottling from "@/assets/gal-oils-bottling.jpg";
import galOilsOlive from "@/assets/gal-oils-olive.jpg";
import galOilsDrums from "@/assets/gal-oils-drums.jpg";
import galFrozenPeas from "@/assets/gal-frozen-peas.jpg";
import galFrozenColdstore from "@/assets/gal-frozen-coldstore.jpg";
import galFrozenMango from "@/assets/gal-frozen-mango.jpg";
import galOtherHoney from "@/assets/gal-other-honey.jpg";
import galOtherCanned from "@/assets/gal-other-canned.jpg";
import galOtherRte from "@/assets/gal-other-rte.jpg";
import galVegPotatoes from "@/assets/gal-veg-potatoes.jpg";
import galVegGarlic from "@/assets/gal-veg-garlic.jpg";
import galFruitCitrus from "@/assets/gal-fruit-citrus.jpg";
import galFruitGrapes from "@/assets/gal-fruit-grapes.jpg";
import galRicePaddy from "@/assets/gal-rice-paddy.jpg";
import galRiceSteamed from "@/assets/gal-rice-steamed.jpg";
import galPulsesLentils from "@/assets/gal-pulses-lentils.jpg";
import galPulsesMung from "@/assets/gal-pulses-mung.jpg";
import galVegCarrotsOkra from "@/assets/gal-veg-carrots-okra.jpg";
import galVegPeppers from "@/assets/gal-veg-peppers.jpg";
import galFruitApples from "@/assets/gal-fruit-apples.jpg";
import galFruitWatermelon from "@/assets/gal-fruit-watermelon.jpg";
import galRicePaddyField from "@/assets/gal-rice-paddy-field.jpg";
import galRiceMillInterior from "@/assets/gal-rice-mill-interior.jpg";
import galPulsesBowls from "@/assets/gal-pulses-bowls.jpg";
import galPulsesSorting from "@/assets/gal-pulses-sorting.jpg";

export interface Category {
  slug: string;
  name: string;
  image: string;
  tagline: string;
  items: string[];
  /** Additional photos shown as a gallery on the Products page. */
  gallery?: string[];
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  image: string;
  origin: string;
  /** Indicative FOB price range shown on the detail page. */
  price: string;
  /** Standard pack / unit weight shown on the detail page. */
  weight: string;
  variety: string;
  grade: string;
  moisture: string;
  packaging: string;
  moq: string;
  supply: string;
  shipping: string;
  privateLabel: string;
  destination: string;
  description: string;
  featured: boolean;
}

export const categories: Category[] = [
  {
    slug: "vegetables",
    name: "Vegetables",
    image: catVegetables,
    tagline: "Farm-fresh, export-grade vegetables shipped in reefer containers",
    items: ["Onion", "Potato", "Tomato", "Carrot", "Green Chilli", "Garlic", "Ginger", "Okra", "Cabbage", "Cauliflower"],
    gallery: [galVegOnions, galVegTomato, galVegChilli, galVegPotatoes, galVegGarlic, galVegCarrotsOkra, galVegPeppers],
  },
  {
    slug: "fruits",
    name: "Fruits",
    image: catFruits,
    tagline: "Sun-ripened fruits graded and packed for long-haul freshness",
    items: ["Mango", "Banana", "Pomegranate", "Grapes", "Orange", "Apple", "Papaya", "Watermelon"],
    gallery: [galFruitMango, galFruitPomegranate, galFruitBanana, galFruitCitrus, galFruitGrapes, galFruitApples, galFruitWatermelon],
  },
  {
    slug: "rice",
    name: "Rice",
    image: catRice,
    tagline: "Premium Basmati and non-Basmati rice from certified mills",
    items: ["Basmati Rice", "1121 Basmati", "Sona Masoori", "Non-Basmati Rice", "Parboiled Rice", "Brown Rice"],
    gallery: [galRiceBasmati, galRiceMill, galRiceBags, galRicePaddy, galRiceSteamed, galRicePaddyField, galRiceMillInterior],
  },
  {
    slug: "pulses",
    name: "Pulses",
    image: catPulses,
    tagline: "Machine-cleaned lentils, dals and beans in bulk and retail packs",
    items: ["Toor Dal", "Moong Dal", "Urad Dal", "Masoor Dal", "Chickpeas", "Kidney Beans"],
    gallery: [galPulsesDals, galPulsesChickpeas, galPulsesBeans, galPulsesLentils, galPulsesMung, galPulsesBowls, galPulsesSorting],
  },
  {
    slug: "eggs",
    name: "Eggs",
    image: catEggs,
    tagline: "Farm-fresh table and hatching eggs in export cartons",
    items: ["White Eggs", "Brown Eggs", "Table Eggs", "Hatching Eggs", "Free-Range Eggs"],
    gallery: [galEggsCartons, galEggsFarm, galEggsBrown],
  },
  {
    slug: "spices",
    name: "Spices",
    image: catSpices,
    tagline: "Whole and ground spices with lab-tested purity and aroma",
    items: ["Turmeric", "Red Chilli", "Black Pepper", "Cardamom", "Cumin", "Coriander", "Cloves", "Cinnamon"],
    gallery: [galSpicesTurmeric, galSpicesMarket, galSpicesPepper],
  },
  {
    slug: "grains",
    name: "Grains",
    image: catGrains,
    tagline: "Food and feed-grade cereals cleaned to export specifications",
    items: ["Wheat", "Maize", "Millet", "Barley", "Sorghum"],
    gallery: [galGrainsWheat, galGrainsSacks, galGrainsSilo],
  },
  {
    slug: "dry-fruits",
    name: "Dry Fruits",
    image: catDryFruits,
    tagline: "Premium dried fruits, graded and vacuum packed",
    items: ["Almonds", "Cashews", "Raisins", "Dates", "Dried Apricots"],
    gallery: [galDryFruitsMix, galDryFruitsDates, galDryFruitsRaisins],
  },
  {
    slug: "nuts-seeds",
    name: "Nuts & Seeds",
    image: catNutsSeeds,
    tagline: "Whole nuts and oilseeds for food processors and retailers",
    items: ["Walnuts", "Pistachios", "Sesame Seeds", "Pumpkin Seeds", "Flax Seeds"],
    gallery: [galNutsWalnuts, galNutsSesame, galNutsSacks],
  },
  {
    slug: "edible-oils",
    name: "Edible Oils",
    image: catOils,
    tagline: "Refined and cold-pressed oils in flexitank, drum and retail packs",
    items: ["Sunflower Oil", "Olive Oil", "Mustard Oil", "Coconut Oil"],
    gallery: [galOilsBottling, galOilsOlive, galOilsDrums],
  },
  {
    slug: "frozen-foods",
    name: "Frozen Foods",
    image: catFrozen,
    tagline: "IQF vegetables, fruits and pulps with full cold-chain control",
    items: ["Frozen Peas", "Mixed Vegetables", "Frozen Berries", "Frozen Mango Pulp"],
    gallery: [galFrozenPeas, galFrozenColdstore, galFrozenMango],
  },
  {
    slug: "other",
    name: "Other Food Products",
    image: catOther,
    tagline: "Honey, canned goods, condiments and specialty food items",
    items: ["Honey", "Canned Goods", "Sauces & Condiments", "Ready-to-Eat Foods"],
    gallery: [galOtherHoney, galOtherCanned, galOtherRte],
  },
];

interface ProductSeed {
  slug: string;
  name: string;
  overrides?: Partial<Product>;
}

const categoryDefaults: Record<
  string,
  Pick<Product, "origin" | "price" | "weight" | "packaging" | "moq" | "shipping" | "variety">
> = {
  vegetables: {
    origin: "India (Nashik / Gujarat belts)",
    price: "US$ 280–420 / MT (FOB)",
    weight: "5–25 kg mesh bags & cartons",
    variety: "Fresh export grade",
    packaging: "Mesh bags / corrugated cartons, 5–25 kg",
    moq: "14 MT (1 × 40' reefer)",
    shipping: "Sea (reefer) / Air",
  },
  fruits: {
    origin: "India (Ratnagiri / Andhra Pradesh)",
    variety: "Premium export grade",
    packaging: "Ventilated cartons, 3–20 kg",
    moq: "5 MT (air) / 12 MT (sea reefer)",
    shipping: "Sea (reefer) / Air",
  },
  rice: {
    origin: "India (Punjab / Haryana)",
    variety: "Long grain, aged 12–24 months",
    packaging: "5kg / 10kg / 25kg / 50kg PP & jute bags",
    moq: "20 MT (1 × 20' FCL)",
    shipping: "Sea / Road",
  },
  pulses: {
    origin: "India / Canada / Australia",
    variety: "Machine cleaned, Sortex graded",
    packaging: "25kg / 50kg PP bags, retail packs on request",
    moq: "20 MT (1 × 20' FCL)",
    shipping: "Sea",
  },
  eggs: {
    origin: "India (Namakkal, Tamil Nadu)",
    variety: "53–65 g graded",
    packaging: "30-egg trays, 360 eggs per export carton",
    moq: "1 × 40' reefer (≈ 1,312 cartons)",
    shipping: "Sea (reefer)",
  },
  spices: {
    origin: "India (Kerala / Telangana / Gujarat)",
    variety: "Whole / ground, lab tested",
    packaging: "25kg / 50kg PP or jute bags with liner",
    moq: "5 MT",
    shipping: "Sea / Air",
  },
  grains: {
    origin: "India / Ukraine / Australia",
    variety: "Food & feed grade",
    packaging: "50kg PP bags / bulk container liner",
    moq: "25 MT (1 × 20' FCL)",
    shipping: "Sea",
  },
  "dry-fruits": {
    origin: "India / USA / Iran / Afghanistan",
    variety: "Premium grade",
    packaging: "10kg / 25kg cartons, vacuum packed",
    moq: "2 MT",
    shipping: "Sea / Air",
  },
  "nuts-seeds": {
    origin: "India / USA / Vietnam",
    variety: "Whole, graded",
    packaging: "25kg / 50kg vacuum bags & cartons",
    moq: "5 MT",
    shipping: "Sea / Air",
  },
  "edible-oils": {
    origin: "India / Ukraine / Spain / Indonesia",
    variety: "Refined / cold pressed",
    packaging: "Flexitank, drums, 1–20 L retail packs",
    moq: "20 MT",
    shipping: "Sea",
  },
  "frozen-foods": {
    origin: "India",
    variety: "IQF, −18°C cold chain",
    packaging: "10kg / 20kg cartons with poly liner",
    moq: "12 MT (1 × 40' reefer)",
    shipping: "Sea (reefer)",
  },
  other: {
    origin: "India",
    variety: "Branded / private label",
    packaging: "Retail & food-service packs",
    moq: "1 × 20' FCL (mixed)",
    shipping: "Sea",
  },
};

const productSeeds: Record<string, ProductSeed[]> = {
  vegetables: [
    {
      slug: "red-onion",
      name: "Fresh Red Onion",
      overrides: {
        origin: "Nashik, Maharashtra, India",
        variety: "Nashik Red, 45–70 mm",
        grade: "A-grade, export sorted",
        packaging: "18kg / 20kg / 25kg mesh bags",
        moq: "14 MT (1 × 40' reefer)",
        featured: true,
        description:
          "Nashik-belt red onions, cured and graded for long sea voyages. Consistent size, pungency and shelf life for Gulf, Asian and African markets.",
      },
    },
    { slug: "potato", name: "Fresh Potato" },
    { slug: "tomato", name: "Fresh Tomato", overrides: { shipping: "Air / Sea (reefer)" } },
    { slug: "carrot", name: "Fresh Carrot" },
    { slug: "green-chilli", name: "Green Chilli", overrides: { shipping: "Air preferred" } },
    { slug: "garlic", name: "Fresh Garlic" },
    { slug: "ginger", name: "Fresh Ginger" },
    { slug: "okra", name: "Okra (Lady Finger)", overrides: { shipping: "Air preferred" } },
    { slug: "cabbage", name: "Cabbage" },
    { slug: "cauliflower", name: "Cauliflower" },
  ],
  fruits: [
    {
      slug: "alphonso-mango",
      name: "Alphonso Mango",
      overrides: {
        image: productMango,
        origin: "Ratnagiri, Maharashtra, India",
        variety: "Alphonso (Hapus), GI tagged",
        grade: "Premium export grade",
        packaging: "3kg / 5kg ventilated cartons",
        moq: "1 MT (air shipments)",
        featured: true,
        description:
          "GI-tagged Alphonso mangoes from Ratnagiri, harvested at peak maturity and hot-water treated for EU, Gulf and Asian destinations.",
      },
    },
    { slug: "banana", name: "Cavendish Banana", overrides: { origin: "Tamil Nadu / Andhra Pradesh, India" } },
    { slug: "pomegranate", name: "Pomegranate", overrides: { variety: "Bhagwa" } },
    { slug: "grapes", name: "Fresh Grapes", overrides: { variety: "Thompson Seedless" } },
    { slug: "orange", name: "Orange", overrides: { variety: "Nagpur / Kinnow" } },
    { slug: "apple", name: "Apple", overrides: { origin: "India / Iran / Poland" } },
    { slug: "papaya", name: "Papaya" },
    { slug: "watermelon", name: "Watermelon" },
  ],
  rice: [
    {
      slug: "basmati-rice",
      name: "1121 Basmati Rice",
      overrides: {
        image: productBasmati,
        origin: "Punjab / Haryana, India",
        variety: "1121 Sella (Steam / Golden / White)",
        grade: "Premium — avg. grain length 8.35 mm",
        moisture: "Max 12.5%",
        packaging: "5kg / 10kg / 25kg / 50kg PP, jute & BOPP bags",
        moq: "20 MT (1 × 20' FCL)",
        featured: true,
        description:
          "Our premium 1121 Basmati is aged for up to 24 months, delivering extra-long grains, rich aroma and non-sticky texture after cooking. Available in steam, golden sella and white sella, with full private-label support.",
      },
    },
    { slug: "sona-masoori", name: "Sona Masoori Rice", overrides: { origin: "Andhra Pradesh / Telangana, India", variety: "Medium grain, lightweight" } },
    { slug: "non-basmati", name: "Non-Basmati Rice", overrides: { variety: "IR64 / Sona Masoori / Ponni" } },
    { slug: "parboiled-rice", name: "Parboiled Rice", overrides: { variety: "IR64 parboiled, 5% broken" } },
    { slug: "brown-rice", name: "Brown Rice", overrides: { variety: "Whole grain basmati / non-basmati" } },
  ],
  pulses: [
    { slug: "toor-dal", name: "Toor Dal (Pigeon Pea)", overrides: { origin: "India / Mozambique / Myanmar" } },
    { slug: "moong-dal", name: "Moong Dal (Green Gram)" },
    { slug: "urad-dal", name: "Urad Dal (Black Gram)", overrides: { origin: "India / Myanmar" } },
    { slug: "masoor-dal", name: "Masoor Dal (Red Lentils)", overrides: { origin: "India / Canada / Australia" } },
    {
      slug: "chickpeas",
      name: "Chickpeas (Kabuli Chana)",
      overrides: {
        origin: "Madhya Pradesh, India / Australia",
        variety: "Kabuli 42/44, 44/46 counts",
        moq: "24 MT (1 × 20' FCL)",
        featured: true,
        description:
          "Bold-calibre Kabuli chickpeas, Sortex cleaned and machine graded. Preferred by canneries, packers and distributors across the Gulf and Mediterranean.",
      },
    },
    { slug: "kidney-beans", name: "Kidney Beans (Rajma)" },
  ],
  eggs: [
    {
      slug: "white-eggs",
      name: "Fresh White Eggs",
      overrides: {
        origin: "Namakkal, Tamil Nadu, India",
        variety: "53–60 g, graded & cleaned",
        grade: "Export table grade",
        moq: "1 × 40' reefer (≈ 1,312 cartons)",
        featured: true,
        description:
          "Farm-fresh white shell table eggs from Namakkal — India's largest egg hub. Graded, cleaned and packed in 360-egg export cartons with veterinary health certification.",
      },
    },
    { slug: "brown-eggs", name: "Fresh Brown Eggs" },
    { slug: "table-eggs", name: "Table Eggs (Mixed)" },
    { slug: "hatching-eggs", name: "Hatching Eggs", overrides: { shipping: "Air / Sea (reefer)" } },
    { slug: "free-range-eggs", name: "Free-Range Eggs" },
  ],
  spices: [
    {
      slug: "turmeric",
      name: "Turmeric Fingers & Powder",
      overrides: {
        origin: "Nizamabad, Telangana / Erode, Tamil Nadu",
        variety: "Curcumin 3–5%",
        grade: "Premium, lab tested",
        packaging: "25kg / 50kg PP or double jute bags",
        moq: "5 MT",
        featured: true,
        description:
          "High-curcumin Nizamabad turmeric, available as polished fingers or sterile-ground powder. Every lot is lab tested for curcumin content, moisture and residue compliance.",
      },
    },
    { slug: "red-chilli", name: "Red Chilli (Whole & Powder)", overrides: { variety: "S4 Sannam / Teja" } },
    { slug: "black-pepper", name: "Black Pepper", overrides: { origin: "Kerala, India / Vietnam", variety: "550–600 G/L" } },
    { slug: "cardamom", name: "Green Cardamom", overrides: { variety: "7–8 mm bold" } },
    { slug: "cumin", name: "Cumin Seeds", overrides: { origin: "Gujarat / Rajasthan, India" } },
    { slug: "coriander", name: "Coriander Seeds" },
    { slug: "cloves", name: "Cloves", overrides: { origin: "Sri Lanka / Madagascar / Indonesia" } },
    { slug: "cinnamon", name: "Cinnamon", overrides: { origin: "Sri Lanka / India" } },
  ],
  grains: [
    { slug: "wheat", name: "Wheat", overrides: { variety: "Milling & feed grades" } },
    { slug: "maize", name: "Maize (Corn)", overrides: { variety: "Yellow maize, 14% max moisture" } },
    { slug: "millet", name: "Millet", overrides: { variety: "Pearl / foxtail / finger" } },
    { slug: "barley", name: "Barley" },
    { slug: "sorghum", name: "Sorghum (Jowar)" },
  ],
  "dry-fruits": [
    { slug: "almonds", name: "Almonds", overrides: { origin: "USA / Iran / Afghanistan" } },
    { slug: "cashews", name: "Cashew Kernels", overrides: { origin: "India / Vietnam", variety: "W240 / W320 / W450" } },
    { slug: "raisins", name: "Raisins", overrides: { origin: "Maharashtra, India / Afghanistan" } },
    { slug: "dates", name: "Dates", overrides: { origin: "UAE / Saudi Arabia / Iran", variety: "Medjool / Deglet / Kimia" } },
    { slug: "dried-apricots", name: "Dried Apricots", overrides: { origin: "Turkey / Afghanistan" } },
  ],
  "nuts-seeds": [
    { slug: "walnuts", name: "Walnuts", overrides: { origin: "USA / Chile / Kashmir" } },
    { slug: "pistachios", name: "Pistachios", overrides: { origin: "Iran / USA" } },
    { slug: "sesame-seeds", name: "Sesame Seeds", overrides: { origin: "India / Ethiopia / Nigeria", variety: "Hulled / natural, 99.95% purity" } },
    { slug: "pumpkin-seeds", name: "Pumpkin Seeds" },
    { slug: "flax-seeds", name: "Flax Seeds" },
  ],
  "edible-oils": [
    { slug: "sunflower-oil", name: "Sunflower Oil", overrides: { origin: "Ukraine / Argentina / India" } },
    { slug: "olive-oil", name: "Olive Oil", overrides: { origin: "Spain / Italy / Turkey", variety: "Extra virgin / pomace" } },
    { slug: "mustard-oil", name: "Mustard Oil", overrides: { origin: "India" } },
    { slug: "coconut-oil", name: "Coconut Oil", overrides: { origin: "Kerala, India / Indonesia" } },
  ],
  "frozen-foods": [
    { slug: "frozen-peas", name: "Frozen Green Peas" },
    { slug: "frozen-mixed-vegetables", name: "Frozen Mixed Vegetables" },
    { slug: "frozen-berries", name: "Frozen Berries" },
    { slug: "frozen-mango-pulp", name: "Frozen Mango Pulp", overrides: { variety: "Alphonso / Totapuri" } },
  ],
  other: [
    { slug: "honey", name: "Natural Honey", overrides: { variety: "Multiflora / sidr" } },
    { slug: "canned-goods", name: "Canned Goods" },
    { slug: "sauces-condiments", name: "Sauces & Condiments" },
    { slug: "ready-to-eat", name: "Ready-to-Eat Foods" },
  ],
};

function buildProduct(categorySlug: string, seed: ProductSeed): Product {
  const category = categories.find((c) => c.slug === categorySlug)!;
  const d = categoryDefaults[categorySlug]!;
  return {
    slug: seed.slug,
    name: seed.name,
    category: categorySlug,
    image: category.image,
    origin: d.origin,
    variety: d.variety,
    grade: "Export grade",
    moisture: "Per specification",
    packaging: d.packaging,
    moq: d.moq,
    supply: "Bulk & contract supply",
    shipping: d.shipping,
    privateLabel: "Available",
    destination: "International",
    description: `Export-grade ${seed.name.toLowerCase()} sourced from audited farms and processors, cleaned, graded and packed to destination specifications. Full documentation and inspection support available on every shipment.`,
    featured: false,
    ...seed.overrides,
  };
}

export const products: Product[] = Object.entries(productSeeds).flatMap(([cat, seeds]) =>
  seeds.map((s) => buildProduct(cat, s)),
);

export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function productsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.category === categorySlug);
}

export const markets = [
  "UAE",
  "India",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Kuwait",
  "Europe",
  "Africa",
  "Asia",
];

export const tradeLanes = [
  "India → UAE",
  "India → Saudi Arabia",
  "India → Qatar",
  "India → Oman",
  "India → Europe",
  "India → Africa",
];

export const contact = {
  company: "Leo Infinity Global General Trading LLC",
  phone: "+971 4 887 2130",
  whatsapp: "+971 50 214 8890",
  whatsappLink: "https://wa.me/971502148890",
  email: "trade@leoinfinity.ae",
  address: "Office 1204, JAFZA One, Jebel Ali Free Zone, Dubai, UAE",
  indiaOffice: "Suite 402, Trade Tower, MG Road, Mumbai 400001, India",
  hours: "Monday – Saturday, 9:00 – 18:00 (GST)",
};
