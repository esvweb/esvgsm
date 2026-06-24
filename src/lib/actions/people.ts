"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

const personSchema = z.object({
  fullName: z.string().min(1),
  nickname: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  department: z.string().optional(),
  userType: z.enum(["SALES_AGENT", "OFFICE_USER", "HEAVY_DATA_USER"]),
});

export async function createPerson(formData: FormData) {
  await requirePermission("manageData");
  const data = personSchema.parse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
    email: formData.get("email") || "",
    department: formData.get("department") || undefined,
    userType: formData.get("userType"),
  });

  const person = await prisma.person.create({
    data: { ...data, email: data.email || undefined },
  });

  revalidatePath("/people");
  redirect(`/people/${person.id}`);
}

export async function updatePerson(personId: string, formData: FormData) {
  await requirePermission("manageData");
  const data = personSchema.parse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
    email: formData.get("email") || "",
    department: formData.get("department") || undefined,
    userType: formData.get("userType"),
  });

  await prisma.person.update({
    where: { id: personId },
    data: { ...data, email: data.email || undefined },
  });

  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
}

export async function setPersonActive(personId: string, active: boolean) {
  await requirePermission("manageData");
  await prisma.person.update({ where: { id: personId }, data: { active } });
  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
}
