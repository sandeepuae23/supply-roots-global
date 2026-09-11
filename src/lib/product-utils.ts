/* eslint-disable prettier/prettier */
import type { Product } from "@/data/catalog";

export type ProductKind = "fresh" | "frozen" | "dry";
export type ProductGroup = "all" | "featured" | "seasonal" | "high-demand";

const freshCategories = new Set(["vegetables", "fruits", "eggs"]);
const seasonalSlugs = new Set([
  "alphonso-mango",
  "pomegranate",
  "grapes",
  "orange",
  "apple",
  "papaya",
  "watermelon",
]);
const highDemandSlugs = new Set([
  "red-onion",
  "alphonso-mango",
  "basmati-rice",
  "chickpeas",
  "white-eggs",
  "turmeric",
  "red-chilli",
  "cashews",
  "dates",
  "sunflower-oil",
  "frozen-peas",
]);

const knownOrigins = [
  "India",
  "UAE",
  "Saudi Arabia",
  "Iran",
  "Poland",
  "Mozambique",
  "Myanmar",
  "Canada",
  "Australia",
  "Vietnam",
  "Sri Lanka",
  "Madagascar",
  "Indonesia",
  "USA",
  "Afghanistan",
  "Turkey",
  "Chile",
  "Ethiopia",
  "Nigeria",
];

export function getProductKind(product: Product): ProductKind {
  if (product.category === "frozen-foods") return "frozen";
  return freshCategories.has(product.category) ? "fresh" : "dry";
}

export function getOriginCountries(product: Product) {
  const matches = knownOrigins.filter((country) => product.origin.toLowerCase().includes(country.toLowerCase()));
  return matches.length ? matches : [product.origin];
}

export function getPackagingGroup(product: Product) {
  const packaging = product.packaging.toLowerCase();
  if (packaging.includes("carton")) return "Cartons";
  if (packaging.includes("bottle") || packaging.includes("drum") || packaging.includes("flexitank")) return "Bottles & drums";
  if (packaging.includes("retail") || packaging.includes("private")) return "Retail & private label";
  if (packaging.includes("bag") || packaging.includes("sack") || packaging.includes("jute") || packaging.includes("pp")) return "Bulk bags";
  return "Other formats";
}

export function getAvailability(product: Product) {
  return seasonalSlugs.has(product.slug) ? "Seasonal sourcing" : "Year-round sourcing";
}

export function matchesProductGroup(product: Product, group: ProductGroup) {
  if (group === "featured") return product.featured;
  if (group === "seasonal") return seasonalSlugs.has(product.slug);
  if (group === "high-demand") return highDemandSlugs.has(product.slug);
  return true;
}

export function isHighDemand(product: Product) {
  return highDemandSlugs.has(product.slug);
}
