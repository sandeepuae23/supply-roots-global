export const QUALITY_BRIEF_KEY = "leo-infinity-quality-brief-v1";

export type QualityBrief = {
  version: 1;
  category: string;
  product: string;
  grade: string;
  variety: string;
  sizeCount: string;
  moisture: string;
  purity: string;
  temperature: string;
  packaging: string;
  inspectionStages: string[];
  tests: string[];
  documents: string[];
  sampleRequested: boolean;
  sampleQuantity: string;
  courierDestination: string;
  targetDate: string;
  notes: string;
  savedAt?: string;
};

export function formatQualityBrief(brief: QualityBrief, productName: string) {
  const lines = [
    `QUALITY BRIEF — ${productName}`,
    brief.grade && `Grade: ${brief.grade}`,
    brief.variety && `Variety: ${brief.variety}`,
    brief.sizeCount && `Size / count: ${brief.sizeCount}`,
    brief.moisture && `Moisture: ${brief.moisture}`,
    brief.purity && `Purity / tolerance: ${brief.purity}`,
    brief.temperature && `Temperature: ${brief.temperature}`,
    brief.packaging && `Packaging: ${brief.packaging}`,
    brief.inspectionStages.length && `Inspection stages: ${brief.inspectionStages.join(", ")}`,
    brief.tests.length && `Tests requested: ${brief.tests.join(", ")}`,
    brief.documents.length && `Documents requested: ${brief.documents.join(", ")}`,
    brief.sampleRequested &&
      `Sample request: ${brief.sampleQuantity || "Quantity to confirm"}; courier destination: ${brief.courierDestination || "To confirm"}; target date: ${brief.targetDate || "To confirm"}`,
    brief.notes && `Quality notes: ${brief.notes}`,
  ].filter(Boolean);
  return lines.join("\n");
}
