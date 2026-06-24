import { prisma } from "@/lib/prisma";
import { createPackage, updatePackage } from "@/lib/actions/packages";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const USER_TYPES = ["SALES_AGENT", "OFFICE_USER", "HEAVY_DATA_USER"] as const;

export default async function PackagesAdminPage() {
  const packages = await prisma.package.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Packages</h1>

      <div className="space-y-4">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <form
              action={async (formData) => {
                "use server";
                await updatePackage(pkg.id, formData);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <Input name="name" defaultValue={pkg.name} required />
                <Input name="listPriceTRY" type="number" step="0.01" defaultValue={Number(pkg.listPriceTRY)} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="isAssignable" defaultChecked={pkg.isAssignable} />
                Assignable directly (uncheck for restricted/minimum packages)
              </label>
              <div className="flex gap-4 text-sm text-muted">
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
              <Button type="submit">Save</Button>
            </form>
          </Card>
        ))}
      </div>

      <Card>
        <form action={createPackage} className="space-y-3">
          <CardTitle>Add package</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Input name="name" placeholder="Name" required />
            <Input name="listPriceTRY" type="number" step="0.01" placeholder="List price (TRY)" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="isAssignable" defaultChecked />
            Assignable directly
          </label>
          <div className="flex gap-4 text-sm text-muted">
            {USER_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="checkbox" name="allowedUserTypes" value={t} />
                {t.replace("_", " ")}
              </label>
            ))}
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}
