"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { assertAssignable, AssignmentRuleError } from "@/lib/assignment-rules";

const createLineSchema = z.object({
  msisdn: z.string().min(1),
  operator: z.string().min(1),
  packageId: z.string().min(1),
  notes: z.string().optional(),
});

export async function createLine(formData: FormData) {
  await requirePermission("manageData");
  const data = createLineSchema.parse({
    msisdn: formData.get("msisdn"),
    operator: formData.get("operator"),
    packageId: formData.get("packageId"),
    notes: formData.get("notes") || undefined,
  });

  const line = await prisma.gsmLine.create({
    data: {
      msisdn: data.msisdn,
      operator: data.operator,
      currentPackageId: data.packageId,
      notes: data.notes,
      status: "IT_DEPOT",
    },
  });

  revalidatePath("/lines");
  redirect(`/lines/${line.id}`);
}

const assignSchema = z.object({
  personId: z.string().min(1),
  displayAsPersonId: z.string().optional(),
  status: z.enum(["ASSIGNED", "RESERVED"]),
  note: z.string().optional(),
});

/** Assign (or reserve) a line for a person, enforcing package/user-type rules. */
export async function assignLine(lineId: string, formData: FormData) {
  const user = await requirePermission("manageData");
  const data = assignSchema.parse({
    personId: formData.get("personId"),
    displayAsPersonId: formData.get("displayAsPersonId") || undefined,
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });

  const [line, person] = await Promise.all([
    prisma.gsmLine.findUniqueOrThrow({ where: { id: lineId }, include: { currentPackage: true } }),
    prisma.person.findUniqueOrThrow({ where: { id: data.personId } }),
  ]);

  try {
    assertAssignable(line.currentPackage, person);
  } catch (err) {
    if (err instanceof AssignmentRuleError) {
      throw new Error(err.message);
    }
    throw err;
  }

  const currentAssignment = await prisma.lineAssignment.findFirst({
    where: { lineId, endDate: null },
  });

  await prisma.$transaction(async (tx) => {
    if (currentAssignment) {
      await tx.lineAssignment.update({
        where: { id: currentAssignment.id },
        data: { endDate: new Date() },
      });
    }

    await tx.lineAssignment.create({
      data: {
        lineId,
        personId: data.personId,
        displayAsPersonId: data.displayAsPersonId,
        packageId: line.currentPackageId,
        assignedByUserId: user.id,
        note: data.note,
      },
    });

    await tx.gsmLine.update({ where: { id: lineId }, data: { status: data.status } });

    await tx.assignmentLog.create({
      data: {
        lineId,
        action: data.status === "ASSIGNED" ? "ASSIGNED" : "RESERVED",
        fromPersonId: currentAssignment?.personId,
        toPersonId: data.personId,
        performedByUserId: user.id,
        note: data.note,
      },
    });
  });

  revalidatePath(`/lines/${lineId}`);
  revalidatePath("/lines");
}

export async function moveLineToDepot(lineId: string, note?: string) {
  const user = await requirePermission("manageData");

  const currentAssignment = await prisma.lineAssignment.findFirst({
    where: { lineId, endDate: null },
  });

  await prisma.$transaction(async (tx) => {
    if (currentAssignment) {
      await tx.lineAssignment.update({
        where: { id: currentAssignment.id },
        data: { endDate: new Date() },
      });
    }

    await tx.gsmLine.update({ where: { id: lineId }, data: { status: "IT_DEPOT" } });

    await tx.assignmentLog.create({
      data: {
        lineId,
        action: "MOVED_TO_DEPOT",
        fromPersonId: currentAssignment?.personId,
        performedByUserId: user.id,
        note,
      },
    });
  });

  revalidatePath(`/lines/${lineId}`);
  revalidatePath("/lines");
}

const changePackageSchema = z.object({ packageId: z.string().min(1) });

export async function changeLinePackage(lineId: string, formData: FormData) {
  const user = await requirePermission("manageData");
  const data = changePackageSchema.parse({ packageId: formData.get("packageId") });

  const line = await prisma.gsmLine.findUniqueOrThrow({ where: { id: lineId } });
  const newPackage = await prisma.package.findUniqueOrThrow({ where: { id: data.packageId } });

  if (line.status !== "IT_DEPOT") {
    const currentAssignment = await prisma.lineAssignment.findFirst({
      where: { lineId, endDate: null },
      include: { person: true },
    });
    if (currentAssignment) {
      try {
        assertAssignable(newPackage, currentAssignment.person);
      } catch (err) {
        if (err instanceof AssignmentRuleError) throw new Error(err.message);
        throw err;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.gsmLine.update({ where: { id: lineId }, data: { currentPackageId: data.packageId } });
    await tx.assignmentLog.create({
      data: {
        lineId,
        action: "PACKAGE_CHANGED",
        fromPackageId: line.currentPackageId,
        toPackageId: data.packageId,
        performedByUserId: user.id,
      },
    });
  });

  revalidatePath(`/lines/${lineId}`);
  revalidatePath("/lines");
}
