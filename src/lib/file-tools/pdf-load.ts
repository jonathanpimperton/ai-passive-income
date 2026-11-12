/**
 * Loading PDFs for rewriting (compress, merge, split) and keeping form
 * fields when pages are copied.
 *
 * - loadPdfForEditing refuses encrypted PDFs up front (review FILES-02,
 *   S1-13). pdf-lib cannot decrypt, so any output written from an encrypted
 *   source is unopenable or blank, even for owner-password-only files that
 *   open without a password (typical bank statements).
 * - It turns pdf-lib's internal errors on junk input ("Cannot read properties
 *   of undefined (reading 'Pages')") into a plain message (FILES-12).
 * - rebuildAcroForm re-attaches the form fields of copied pages (FILES-19):
 *   pdf-lib's copyPages copies widget annotations but not the document's
 *   /AcroForm, so merged and split forms could no longer be filled in.
 *
 * pdf-lib is imported lazily so it stays out of the initial page bundle.
 */
import type { PDFDocument } from 'pdf-lib';
import { looksLikePdf, hasEncryptDictionary, encryptedPdfMessage, unreadablePdfMessage } from './pdf-checks';

export type PdfLoadResult =
  | { ok: true; doc: PDFDocument; pageCount: number }
  | { ok: false; reason: 'encrypted' | 'unreadable'; message: string };

/** Load a PDF with pdf-lib for rewriting; refuses encrypted or unreadable files with a user-facing message. */
export async function loadPdfForEditing(bytes: Uint8Array, fileName: string): Promise<PdfLoadResult> {
  if (!looksLikePdf(bytes)) return { ok: false, reason: 'unreadable', message: unreadablePdfMessage(fileName) };
  const { PDFDocument } = await import('pdf-lib');
  let doc: PDFDocument;
  try {
    // ignoreEncryption only lets us INSPECT the file; encrypted files are refused below.
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    if (hasEncryptDictionary(bytes)) return { ok: false, reason: 'encrypted', message: encryptedPdfMessage(fileName) };
    return { ok: false, reason: 'unreadable', message: unreadablePdfMessage(fileName) };
  }
  if (doc.isEncrypted || hasEncryptDictionary(bytes)) {
    return { ok: false, reason: 'encrypted', message: encryptedPdfMessage(fileName) };
  }
  let pageCount: number;
  try {
    pageCount = doc.getPageCount();
  } catch {
    return { ok: false, reason: 'unreadable', message: unreadablePdfMessage(fileName) };
  }
  if (pageCount < 1) return { ok: false, reason: 'unreadable', message: `"${fileName}" has no pages.` };
  return { ok: true, doc, pageCount };
}

/**
 * After copying pages into `target`, rebuild its /AcroForm from the copied
 * widget annotations so the form fields work again. Field-level defaults
 * (DA, DR, NeedAppearances) come from the first source that has a form.
 * Root fields whose names collide across merged documents get a "_2"-style
 * suffix so they stay independent. Returns the number of root fields.
 */
export async function rebuildAcroForm(target: PDFDocument, sources: PDFDocument[]): Promise<number> {
  const { PDFName, PDFDict, PDFRef, PDFString, PDFHexString, PDFObjectCopier } = await import('pdf-lib');
  const ctx = target.context;
  const rootRefs: InstanceType<typeof PDFRef>[] = [];
  const seen = new Set<string>();

  for (const page of target.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const entry = annots.get(i);
      if (!(entry instanceof PDFRef)) continue;
      const annot = ctx.lookupMaybe(entry, PDFDict);
      if (!annot || annot.get(PDFName.of('Subtype'))?.toString() !== '/Widget') continue;
      let rootRef = entry;
      let root = annot;
      for (let guard = 0; guard < 32; guard++) {
        const parentRef = root.get(PDFName.of('Parent'));
        if (!(parentRef instanceof PDFRef)) break;
        const parent = ctx.lookupMaybe(parentRef, PDFDict);
        if (!parent) break;
        rootRef = parentRef;
        root = parent;
      }
      const isField = root.has(PDFName.of('FT')) || root.has(PDFName.of('T')) || root.has(PDFName.of('Kids'));
      if (isField && !seen.has(rootRef.toString())) {
        seen.add(rootRef.toString());
        rootRefs.push(rootRef);
      }
    }
  }
  if (rootRefs.length === 0) return 0;

  // Keep root field names unique so fields from different files stay independent.
  const names = new Map<string, number>();
  for (const ref of rootRefs) {
    const field = ctx.lookupMaybe(ref, PDFDict);
    const t = field?.get(PDFName.of('T'));
    if (!field || !(t instanceof PDFString || t instanceof PDFHexString)) continue;
    const name = t.decodeText();
    const count = (names.get(name) ?? 0) + 1;
    names.set(name, count);
    if (count > 1) field.set(PDFName.of('T'), PDFHexString.fromText(`${name}_${count}`));
  }

  const acroForm = ctx.obj({}) as InstanceType<typeof PDFDict>;
  acroForm.set(PDFName.of('Fields'), ctx.obj(rootRefs));
  for (const src of sources) {
    const srcForm = src.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (!srcForm) continue;
    const copier = PDFObjectCopier.for(src.context, ctx);
    for (const key of ['DA', 'DR', 'NeedAppearances', 'Q']) {
      const value = srcForm.get(PDFName.of(key));
      if (value) acroForm.set(PDFName.of(key), copier.copy(value));
    }
    break;
  }
  target.catalog.set(PDFName.of('AcroForm'), ctx.register(acroForm));
  return rootRefs.length;
}
