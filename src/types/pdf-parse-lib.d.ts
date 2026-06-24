declare module "pdf-parse/lib/pdf-parse.js" {
  import type { Result, Options } from "pdf-parse";
  function pdfParse(data: Buffer, options?: Options): Promise<Result>;
  export default pdfParse;
}
