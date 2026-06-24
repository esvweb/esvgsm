"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

export async function ackAlert(alertId: string) {
  await requirePermission("uploadBills");
  await prisma.alert.update({ where: { id: alertId }, data: { status: "ACKED" } });
  revalidatePath("/alerts");
}
