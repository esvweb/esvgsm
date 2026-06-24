"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

const deviceSchema = z.object({
  imei: z.string().min(1),
  model: z.string().min(1),
});

export async function createDevice(formData: FormData) {
  await requirePermission("manageData");
  const data = deviceSchema.parse({
    imei: formData.get("imei"),
    model: formData.get("model"),
  });
  await prisma.device.create({ data: { ...data, status: "IT_DEPOT" } });
  revalidatePath("/devices");
}

export async function linkDeviceToLine(deviceId: string, lineId: string | null) {
  const user = await requirePermission("manageData");

  const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId } });
  const previousLineId = device.assignedLineId;

  await prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id: deviceId },
      data: { assignedLineId: lineId, status: lineId ? "IN_USE" : "IT_DEPOT" },
    });

    if (previousLineId && previousLineId !== lineId) {
      await tx.assignmentLog.create({
        data: {
          lineId: previousLineId,
          action: "DEVICE_UNLINKED",
          performedByUserId: user.id,
          note: `Device ${device.imei} (${device.model}) unlinked`,
        },
      });
    }
    if (lineId) {
      await tx.assignmentLog.create({
        data: {
          lineId,
          action: "DEVICE_LINKED",
          performedByUserId: user.id,
          note: `Device ${device.imei} (${device.model}) linked`,
        },
      });
    }
  });

  revalidatePath("/devices");
  if (previousLineId) revalidatePath(`/lines/${previousLineId}`);
  if (lineId) revalidatePath(`/lines/${lineId}`);
}
