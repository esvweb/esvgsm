import { uploadBillBatch } from "@/lib/actions/bills";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export default function UploadBillPage() {
  const now = new Date();

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Upload monthly bill</h1>
      <Card>
        <form action={uploadBillBatch} className="space-y-3">
          <CardTitle>Bill details</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Input name="periodMonth" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} required />
            <Input name="periodYear" type="number" defaultValue={now.getFullYear()} required />
          </div>
          <Input name="operator" placeholder="Operator" defaultValue="Vodafone" required />
          <input name="file" type="file" accept="application/pdf" required className="w-full text-sm" />
          <Button type="submit">Upload &amp; extract</Button>
          <p className="text-xs text-muted">
            The PDF is parsed and sent to OpenAI to extract per-number charges. You&apos;ll review and confirm
            matches on the next screen before alerts are generated.
          </p>
        </form>
      </Card>
    </div>
  );
}
