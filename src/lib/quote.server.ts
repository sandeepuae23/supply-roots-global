/* eslint-disable prettier/prettier */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const COMPANY_EMAIL = "support@leoinfinityglobal.com";
const COMPANY_WHATSAPP = "971569705667";

type ProductRequest = {
  product: string;
  specification: string;
  quantity: string;
  unit: string;
};

export type QuoteSubmissionResult = {
  ok: boolean;
  delivered: boolean;
  reference?: string;
  message: string;
  errors?: Record<string, string>;
  whatsappUrl?: string;
  emailUrl?: string;
};

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

function value(form: FormData, name: string) {
  const raw = form.get(name);
  return typeof raw === "string" ? raw.trim() : "";
}

function parseProducts(raw: string): ProductRequest[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, 12)
      .map((item) => {
        const row = item as Partial<ProductRequest>;
        return {
          product: String(row.product ?? "").slice(0, 100).trim(),
          specification: String(row.specification ?? "").slice(0, 240).trim(),
          quantity: String(row.quantity ?? "").slice(0, 30).trim(),
          unit: String(row.unit ?? "").slice(0, 30).trim(),
        };
      })
      .filter((item) => item.product || item.specification || item.quantity);
  } catch {
    return [];
  }
}

function makeReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `LEO-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function cleanLine(text: string) {
  return text.replace(/[\r\n]+/g, " ").slice(0, 500);
}

function getFiles(form: FormData) {
  return form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
}

function validateQuote(form: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = ["company", "contactName", "email", "phone", "destinationCountry", "incoterm", "contactMethod"];
  required.forEach((field) => {
    if (!value(form, field)) errors[field] = "Required";
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(form, "email"))) errors["email"] = "Enter a valid email address";
  if (parseProducts(value(form, "products")).length === 0) errors["products"] = "Add at least one product";
  const files = getFiles(form);
  if (files.length > MAX_FILES) errors["files"] = `Attach no more than ${MAX_FILES} files`;
  if (files.some((file) => file.size > MAX_FILE_SIZE)) errors["files"] = "Each attachment must be 5 MB or smaller";
  if (files.some((file) => !ACCEPTED_FILES.has(file.type))) errors["files"] = "Use PDF, JPG, PNG or WebP files";
  if (value(form, "website")) errors["form"] = "Unable to submit this form";
  const startedAt = Number(value(form, "startedAt"));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500) errors["form"] = "Please review the request and try again";
  return errors;
}

function enforceRateLimit() {
  const key = (getRequestHeader("x-forwarded-for") ?? getRequestHeader("x-real-ip") ?? "local").split(",")[0]!.trim();
  const now = Date.now();
  const current = rateStore.get(key);
  if (!current || current.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
}

function formatQuote(form: FormData, reference: string) {
  const products = parseProducts(value(form, "products"));
  const lines = [
    `Quote reference: ${reference}`,
    `Company: ${cleanLine(value(form, "company"))}`,
    `Contact: ${cleanLine(value(form, "contactName"))}`,
    `Email: ${cleanLine(value(form, "email"))}`,
    `Phone: ${cleanLine(value(form, "phone"))}`,
    `Destination: ${cleanLine(value(form, "destinationCountry"))} / ${cleanLine(value(form, "destinationPort"))}`,
    `Preferred delivery: ${cleanLine(value(form, "deliveryDate")) || "Not specified"}`,
    `Incoterm: ${cleanLine(value(form, "incoterm"))}`,
    `Packaging: ${cleanLine(value(form, "packaging")) || "To be advised"}`,
    `Preferred contact: ${cleanLine(value(form, "contactMethod"))}`,
    "",
    "Products:",
    ...products.map((item, index) => `${index + 1}. ${cleanLine(item.product)} — ${cleanLine(item.quantity)} ${cleanLine(item.unit)} — ${cleanLine(item.specification) || "Specification to be advised"}`),
    "",
    `Additional requirements: ${cleanLine(value(form, "notes")) || "None"}`,
    `Attachments: ${getFiles(form).map((file) => file.name).join(", ") || "None"}`,
  ];
  return { products, text: lines.join("\n") };
}

async function deliverToWebhook(form: FormData, reference: string, text: string) {
  const url = process.env["QUOTE_WEBHOOK_URL"];
  if (!url) return false;
  const outbound = new FormData();
  outbound.set("reference", reference);
  outbound.set("summary", text);
  outbound.set("payload", JSON.stringify(Object.fromEntries(Array.from(form.entries()).filter(([key]) => key !== "files"))));
  getFiles(form).forEach((file) => outbound.append("files", file, file.name));
  const headers: Record<string, string> = {};
  if (process.env["QUOTE_WEBHOOK_SECRET"]) headers["authorization"] = `Bearer ${process.env["QUOTE_WEBHOOK_SECRET"]}`;
  const response = await fetch(url, { method: "POST", headers, body: outbound, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Quote webhook returned ${response.status}`);
  return true;
}

async function deliverByEmail(reference: string, text: string, replyTo: string) {
  if (!process.env["RESEND_API_KEY"] || !process.env["QUOTE_NOTIFY_EMAIL"] || !process.env["QUOTE_FROM_EMAIL"]) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env["RESEND_API_KEY"]}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env["QUOTE_FROM_EMAIL"],
      to: [process.env["QUOTE_NOTIFY_EMAIL"]],
      reply_to: replyTo,
      subject: `New trade enquiry ${reference}`,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

export const submitQuote = createServerFn({ method: "POST" })
  .validator((form: FormData) => form)
  .handler(async ({ data: form }): Promise<QuoteSubmissionResult> => {
    if (!enforceRateLimit()) return { ok: false, delivered: false, message: "Too many requests. Please wait 15 minutes and try again.", errors: { form: "Rate limit reached" } };
    const errors = validateQuote(form);
    if (Object.keys(errors).length) return { ok: false, delivered: false, message: "Please correct the highlighted fields.", errors };

    const reference = makeReference();
    const { products, text } = formatQuote(form, reference);
    const whatsappText = `Hello, I have prepared quote request ${reference} for ${products.map((item) => item.product).join(", ")}. Please confirm receipt.`;
    const whatsappUrl = `https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(whatsappText)}`;
    const emailUrl = `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(`Trade enquiry ${reference}`)}&body=${encodeURIComponent(text)}`;

    let delivered = false;
    try {
      const deliveries = await Promise.all([
        deliverToWebhook(form, reference, text),
        deliverByEmail(reference, text, value(form, "email")),
      ]);
      delivered = deliveries.some(Boolean);
    } catch (error) {
      console.error("Quote delivery provider failed", error instanceof Error ? error.message : "Unknown provider error");
    }

    return {
      ok: true,
      delivered,
      reference,
      whatsappUrl,
      emailUrl,
      message: delivered
        ? "Your enquiry was delivered. Our trade desk normally responds within one business day."
        : "Your reference is ready. Send the prepared request by WhatsApp or email to complete delivery.",
    };
  });
