"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { storeBillFile } from "@/lib/bill-storage";
import { extractPdfText } from "@/lib/pdf-text";
import { extractBillLineItems, normalizeMsisdn } from "@/lib/openai-bill-extraction";
import { runAlertsForBatch } from "@/lib/alert-engine";

const uploadSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2000),
  operator: z.string().min(1),
});

export async function uploadBillBatch(formData: FormData) {
  const user = await requirePermission("uploadBills");
  const data = uploadSchema.parse({
    periodMonth: formData.get("periodMonth"),
    periodYear: formData.get("periodYear"),
    operator: formData.get("operator"),
  });
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("A PDF bill file is required.");

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileUrl = await storeBillFile(`${data.periodYear}-${data.periodMonth}-${file.name}`, buffer);

  const batch = await prisma.monthlyBillBatch.create({
    data: {
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      operator: data.operator,
      fileUrl,
      uploadedByUserId: user.id,
      status: "PROCESSING",
    },
  });

  try {
    const text = await extractPdfText(buffer);
    const lineItems = await extractBillLineItems(text);
    const lines = await prisma.gsmLine.findMany();

    const linesByNormalized = new Map(lines.map((l) => [normalizeMsisdn(l.msisdn), l]));

    await prisma.lineBillRecord.createMany({
      data: lineItems.map((item) => {
        const matched = linesByNormalized.get(normalizeMsisdn(item.phoneNumber));
        return {
          batchId: batch.id,
          lineId: matched?.id ?? null,
          rawExtractedNumber: item.phoneNumber,
          amountTRY: item.amountTRY,
          matchedManually: false,
        };
      }),
    });

    await prisma.monthlyBillBatch.update({ where: { id: batch.id }, data: { status: "REVIEW" } });
  } catch (err) {
    console.error("Bill extraction failed", err);
    await prisma.monthlyBillBatch.update({ where: { id: batch.id }, data: { status: "REVIEW" } });
  }

  revalidatePath("/bills");
  redirect(`/bills/${batch.id}`);
}

const matchSchema = z.object({ lineId: z.string().optional() });

export async function matchBillRecord(recordId: string, formData: FormData) {
  await requirePermission("uploadBills");
  const { lineId } = matchSchema.parse({ lineId: formData.get("lineId") || undefined });
  const record = await prisma.lineBillRecord.update({
    where: { id: recordId },
    data: { lineId: lineId ?? null, matchedManually: true },
  });
  revalidatePath(`/bills/${record.batchId}`);
}

export async function confirmBillBatch(batchId: string) {
  await requirePermission("uploadBills");
  await prisma.monthlyBillBatch.update({ where: { id: batchId }, data: { status: "CONFIRMED" } });
  await runAlertsForBatch(batchId);
  revalidatePath(`/bills/${batchId}`);
  revalidatePath("/alerts");
}
