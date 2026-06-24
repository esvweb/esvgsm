import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { createDevice, linkDeviceToLine } from "@/lib/actions/devices";

export default async function DevicesPage() {
  const [devices, lines, session] = await Promise.all([
    prisma.device.findMany({ include: { assignedLine: true }, orderBy: { model: "asc" } }),
    prisma.gsmLine.findMany({ orderBy: { msisdn: "asc" } }),
    auth(),
  ]);
  const canEdit = session ? can(session.user.role, "manageData") : false;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Devices</h1>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">IMEI</th>
              <th className="px-4 py-2">Model</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Linked line</th>
              {canEdit && <th className="px-4 py-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{d.imei}</td>
                <td className="px-4 py-2">{d.model}</td>
                <td className="px-4 py-2">{d.status.replace("_", " ")}</td>
                <td className="px-4 py-2">{d.assignedLine?.msisdn ?? "—"}</td>
                {canEdit && (
                  <td className="px-4 py-2">
                    <form
                      action={async (formData) => {
                        "use server";
                        const lineId = formData.get("lineId") as string;
                        await linkDeviceToLine(d.id, lineId || null);
                      }}
                      className="flex gap-2"
                    >
                      <select name="lineId" defaultValue={d.assignedLineId ?? ""} className="rounded border border-slate-300 px-2 py-1 text-xs">
                        <option value="">Unlinked</option>
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.msisdn}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                        Save
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form action={createDevice} className="max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">Add device</h2>
          <input name="imei" placeholder="IMEI" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          <input name="model" placeholder="Model" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Create
          </button>
        </form>
      )}
    </div>
  );
}
