import { uploadBillBatch } from "@/lib/actions/bills";

export default function UploadBillPage() {
  const now = new Date();

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Upload monthly bill</h1>
      <form action={uploadBillBatch} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="periodMonth"
            type="number"
            min={1}
            max={12}
            defaultValue={now.getMonth() + 1}
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="periodYear"
            type="number"
            defaultValue={now.getFullYear()}
            required
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input name="operator" placeholder="Operator" defaultValue="Vodafone" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <input name="file" type="file" accept="application/pdf" required className="w-full text-sm" />
        <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Upload &amp; extract
        </button>
        <p className="text-xs text-slate-500">
          The PDF is parsed and sent to OpenAI to extract per-number charges. You&apos;ll review and confirm matches
          on the next screen before alerts are generated.
        </p>
      </form>
    </div>
  );
}
