import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { Alert } from 'react-native';

import { docTypeInfo } from '@/lib/deal-flow';
import { signedFileUrl, type DealFile } from '@/lib/deals';

/**
 * One PDF with all of a car's documents, for WhatsApp (Terry,
 * 2026-11-18): no UCG employee uses the app, so when the customer sells
 * their car back (or to anyone), they send the paperwork themselves. The
 * share sheet takes one file at a time, so the documents are merged into
 * a single PDF first.
 */

async function localUri(file: DealFile): Promise<string> {
  const url = await signedFileUrl(file.storage_path);
  if (url.startsWith('file://')) return url;
  const target = `${FileSystem.cacheDirectory}packet-part-${file.id}.pdf`;
  const { uri } = await FileSystem.downloadAsync(url, target);
  return uri;
}

/** Merges the files (in the order given) into one PDF on the phone.
 * A document that can't be read (e.g. password-protected) is skipped and
 * reported. */
export async function buildPacket(files: DealFile[], fileName: string): Promise<{ uri: string; skipped: string[] }> {
  const packet = await PDFDocument.create();
  const skipped: string[] = [];
  for (const file of files) {
    try {
      const base64 = await FileSystem.readAsStringAsync(await localUri(file), { encoding: 'base64' });
      const doc = await PDFDocument.load(base64, { ignoreEncryption: true });
      const pages = await packet.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => packet.addPage(p));
    } catch {
      skipped.push(docTypeInfo(file.doc_type).label);
    }
  }
  if (packet.getPageCount() === 0) throw new Error('No readable documents');
  const out = await packet.saveAsBase64();
  const uri = `${FileSystem.cacheDirectory}${fileName.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
  await FileSystem.writeAsStringAsync(uri, out, { encoding: 'base64' });
  return { uri, skipped };
}

/** Builds the packet and opens the share sheet (WhatsApp, email, print…). */
export async function sharePacket(files: DealFile[], fileName: string, dialogTitle: string): Promise<boolean> {
  if (files.length === 0) {
    Alert.alert('No documents yet', 'Add your paperwork in the Documents tab first.');
    return false;
  }
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Not available', "Sharing isn't available on this device.");
    return false;
  }
  try {
    const { uri, skipped } = await buildPacket(files, fileName);
    if (skipped.length > 0) {
      Alert.alert('Some documents were left out', `These couldn't be added to the PDF: ${skipped.join(', ')}. You can share them one by one from Documents.`);
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
    return true;
  } catch {
    Alert.alert("Couldn't put the documents together", 'Check your connection and try again, or share them one by one from Documents.');
    return false;
  }
}
