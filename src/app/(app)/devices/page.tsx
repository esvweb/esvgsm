import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { createDevice, linkDeviceToLine } from "@/lib/actions/devices";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export default async function DevicesPage() {
  const [devices, lines, session] = await Promise.all([
    prisma.device.findMany({ include: { assignedLine: true }, orderBy: { model: "asc" } }),
    prisma.gsmLine.findMany({ orderBy: { msisdn: "asc" } }),
    auth(),
  ]);
  const canEdit = session ? can(session.user.role, "manageData") : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Devices</h1>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">IMEI</th>
              <th className="px-5 py-3">Model</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Linked line</th>
              {canEdit && <th className="px-5 py-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-5 py-3 font-mono text-foreground">{d.imei}</td>
                <td className="px-5 py-3 text-muted">{d.model}</td>
                <td className="px-5 py-3">
                  <Badge variant={d.status === "IN_USE" ? "secondary" : "neutral"}>
                    {d.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-muted">{d.assignedLine?.msisdn ?? "—"}</td>
                {canEdit && (
                  <td className="px-5 py-3">
                    <form
                      action={async (formData) => {
                        "use server";
                        const lineId = formData.get("lineId") as string;
                        await linkDeviceToLine(d.id, lineId || null);
                      }}
                      className="flex gap-2"
                    >
                      <Select name="lineId" defaultValue={d.assignedLineId ?? ""} className="py-1.5 text-xs">
                        <option value="">Unlinked</option>
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.msisdn}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                        Save
                      </Button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {canEdit && (
        <Card className="max-w-md">
          <form action={createDevice} className="space-y-3">
            <CardTitle>Add device</CardTitle>
            <Input name="imei" placeholder="IMEI" required />
            <Input name="model" placeholder="Model" required />
            <Button type="submit">Create</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
