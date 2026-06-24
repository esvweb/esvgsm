import { prisma } from "@/lib/prisma";
import { createPackage, updatePackage } from "@/lib/actions/packages";

const USER_TYPES = ["SALES_AGENT", "OFFICE_USER", "HEAVY_DATA_USER"] as const;

export default async function PackagesAdminPage() {
  const packages = await prisma.package.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Packages</h1>

      <div className="space-y-4">
        {packages.map((pkg) => (
          <form
            key={pkg.id}
            action={async (formData) => {
              "use server";
              await updatePackage(pkg.id, formData);
            }}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <input name="name" defaultValue={pkg.name} required className="rounded border border-slate-300 px-3 py-2 text-sm" />
              <input
                name="listPriceTRY"
                type="number"
                step="0.01"
                defaultValue={Number(pkg.listPriceTRY)}
                required
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="isAssignable" defaultChecked={pkg.isAssignable} />
              Assignable directly (uncheck for restricted/minimum packages)
            </label>
            <div className="flex gap-4 text-sm text-slate-600">
              {USER_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="allowedUserTypes"
                    value={t}
                    defaultChecked={pkg.allowedUserTypes.includes(t)}
                  />
                  {t.replace("_", " ")}
                </label>
              ))}
            </div>
            <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save
            </button>
          </form>
        ))}
      </div>

      <form action={createPackage} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Add package</h2>
        <div className="grid grid-cols-2 gap-3">
          <input name="name" placeholder="Name" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input name="listPriceTRY" type="number" step="0.01" placeholder="List price (TRY)" required className="rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isAssignable" defaultChecked />
          Assignable directly
        </label>
        <div className="flex gap-4 text-sm text-slate-600">
          {USER_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1">
              <input type="checkbox" name="allowedUserTypes" value={t} />
              {t.replace("_", " ")}
            </label>
          ))}
        </div>
        <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Create
        </button>
      </form>
    </div>
  );
}
