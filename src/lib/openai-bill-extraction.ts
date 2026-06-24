import OpenAI from "openai";
import { z } from "zod";

const lineItemSchema = z.object({
  phoneNumber: z.string(),
  amountTRY: z.number(),
});

const extractionSchema = z.object({
  lineItems: z.array(lineItemSchema),
});

export type ExtractedLineItem = z.infer<typeof lineItemSchema>;

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * Extracts per-number charges from raw operator bill text using OpenAI structured outputs.
 * The bill PDF is parsed to text upstream (see pdf-text.ts) and passed in here.
 */
export async function extractBillLineItems(billText: string): Promise<ExtractedLineItem[]> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You extract per-phone-number charges from Turkish mobile operator bill statements. " +
          "Return every line item (one per GSM number) with its phone number and total charge in TRY for the billing period. " +
          "Normalize phone numbers to digits only, including country/area code as printed (e.g. 05XXXXXXXXX or 5XXXXXXXXX). " +
          "Sum all charges for a number (line rental + usage + tax) into a single total per number.",
      },
      { role: "user", content: billText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "bill_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phoneNumber: { type: "string" },
                  amountTRY: { type: "number" },
                },
                required: ["phoneNumber", "amountTRY"],
                additionalProperties: false,
              },
            },
          },
          required: ["lineItems"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = extractionSchema.parse(JSON.parse(content));
  return parsed.lineItems;
}

/** Normalizes a Turkish mobile number to its last 10 digits for matching against GsmLine.msisdn. */
export function normalizeMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10);
}
