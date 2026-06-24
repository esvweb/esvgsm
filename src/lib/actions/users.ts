"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "IT_STAFF", "FINANCE", "VIEWER"]),
  password: z.string().min(8),
});

export async function createUser(formData: FormData) {
  await requirePermission("manageUsers");
  const data = userSchema.parse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });

  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, active: boolean) {
  await requirePermission("manageUsers");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/users");
}

const roleSchema = z.object({ role: z.enum(["ADMIN", "IT_STAFF", "FINANCE", "VIEWER"]) });

export async function setUserRole(userId: string, formData: FormData) {
  await requirePermission("manageUsers");
  const { role } = roleSchema.parse({ role: formData.get("role") });
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}
