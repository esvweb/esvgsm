"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

const packageSchema = z.object({
  name: z.string().min(1),
  listPriceTRY: z.coerce.number().min(0),
  isAssignable: z.coerce.boolean(),
  allowedUserTypes: z.array(z.enum(["SALES_AGENT", "OFFICE_USER", "HEAVY_DATA_USER"])),
});

export async function createPackage(formData: FormData) {
  await requirePermission("manageSettings");
  const data = packageSchema.parse({
    name: formData.get("name"),
    listPriceTRY: formData.get("listPriceTRY"),
    isAssignable: formData.get("isAssignable") === "on",
    allowedUserTypes: formData.getAll("allowedUserTypes"),
  });

  await prisma.package.create({ data });
  revalidatePath("/admin/packages");
}

export async function updatePackage(packageId: string, formData: FormData) {
  await requirePermission("manageSettings");
  const data = packageSchema.parse({
    name: formData.get("name"),
    listPriceTRY: formData.get("listPriceTRY"),
    isAssignable: formData.get("isAssignable") === "on",
    allowedUserTypes: formData.getAll("allowedUserTypes"),
  });

  await prisma.package.update({ where: { id: packageId }, data });
  revalidatePath("/admin/packages");
}
