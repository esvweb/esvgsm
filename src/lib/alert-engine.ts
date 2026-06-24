import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";

const THRESHOLD_PCT = 25;

/**
 * For a confirmed bill batch, flags every line whose bill differs from its package's
 * list price by more than THRESHOLD_PCT, creates an Alert row, and emails IT/Admin
 * plus the line's currently-assigned person via Brevo.
 */
export async function runAlertsForBatch(batchId: string) {
  const records = await prisma.lineBillRecord.findMany({
    where: { batchId, lineId: { not: null } },
    include: {
      line: {
        include: {
          currentPackage: true,
          assignments: { where: { endDate: null }, include: { person: true } },
        },
      },
    },
  });

  const itList = (process.env.ALERTS_IT_DISTRIBUTION_LIST ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  for (const record of records) {
    if (!record.line) continue;
    const listPrice = Number(record.line.currentPackage.listPriceTRY);
    if (listPrice <= 0) continue;

    const amount = Number(record.amountTRY);
    const pctDiff = ((amount - listPrice) / listPrice) * 100;
    if (Math.abs(pctDiff) <= THRESHOLD_PCT) continue;

    const holder = record.line.assignments[0]?.person;
    const recipients = [...itList, ...(holder?.email ? [holder.email] : [])];

    const alert = await prisma.alert.create({
      data: {
        lineBillRecordId: record.id,
        pctDiff,
        recipients,
        status: recipients.length > 0 ? "SENT" : "PENDING",
        sentAt: recipients.length > 0 ? new Date() : null,
      },
    });

    if (recipients.length > 0) {
      await sendBrevoEmail({
        to: recipients.map((email) => ({ email })),
        subject: `GSM bill overage: ${record.line.msisdn} (${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(1)}%)`,
        htmlContent: `
          <p>Line <strong>${record.line.msisdn}</strong> (${record.line.currentPackage.name}) billed
          <strong>${amount.toFixed(2)} TRY</strong> this period, vs. a list price of
          <strong>${listPrice.toFixed(2)} TRY</strong> — a difference of
          <strong>${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(1)}%</strong>.</p>
          ${holder ? `<p>Currently assigned to: ${holder.fullName}</p>` : "<p>This line is unassigned.</p>"}
          <p>Alert ID: ${alert.id}</p>
        `,
      });
    }
  }
}
