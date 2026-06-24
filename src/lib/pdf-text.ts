// Import the inner module directly: pdf-parse's index.js has a debug-mode
// check (`!module.parent`) that misfires under webpack bundling and tries to
// read a nonexistent test fixture file at import time.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(data: Buffer): Promise<string> {
  const result = await pdfParse(data);
  return result.text;
}
