import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { Alert } from 'react-native';

/**
 * Turning paper into a PDF for a deal.
 *
 * Today this is a COLOR photo per page (system camera, with its crop
 * step) stitched into one PDF. Terry wants a true document scanner
 * (edge detection, straightening) — that needs native code and an EAS
 * development build, which is deliberately on hold. When that happens,
 * only `scanPages` changes: everything downstream already takes a PDF.
 *
 * Documents are kept larger than condition photos (lib/image.ts): the
 * VIN, names and prices have to stay readable, by people now and by
 * automatic checks later.
 */

const DOC_WIDTH = 1800;
const DOC_QUALITY = 0.75;

export interface ScannedPdf {
  uri: string;
  pageCount: number;
}

async function prepare(uri: string): Promise<string> {
  try {
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: DOC_WIDTH }).renderAsync();
    const saved = await rendered.saveAsync({ compress: DOC_QUALITY, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri;
  }
}

/** One A4-ish page per image, in order. Color is kept as-is. */
export async function imagesToPdf(imageUris: string[]): Promise<ScannedPdf> {
  const pages = await Promise.all(
    imageUris.map(async (uri) => {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      return `<div class="page"><img src="data:image/jpeg;base64,${base64}" /></div>`;
    }),
  );
  const html = `<html><head><style>
    @page { margin: 0; }
    body { margin: 0; }
    .page { height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { max-width: 100%; max-height: 100%; }
  </style></head><body>${pages.join('')}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  return { uri, pageCount: imageUris.length };
}

async function captureOne(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to scan documents.');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: true };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return prepare(result.assets[0].uri);
}

function askNext(title: string, message: string): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Choose Photo', onPress: () => resolve('library') },
      { text: 'Take Photo', onPress: () => resolve('camera') },
    ]);
  });
}

/**
 * Walks the user through each page: "Front", then "Back" (or any number
 * of pages when `pages` is null). Returns null if they cancel.
 */
export async function scanPages(documentLabel: string, pages: string[] | null): Promise<ScannedPdf | null> {
  const images: string[] = [];
  if (pages) {
    for (const page of pages) {
      const source = await askNext(`${documentLabel}: ${page}`, `Lay the ${page.toLowerCase()} flat in good light, filling the frame.`);
      if (!source) return null;
      const uri = await captureOne(source);
      if (!uri) return null;
      images.push(uri);
    }
  } else {
    for (;;) {
      const n = images.length + 1;
      const source = await askNext(`${documentLabel}: page ${n}`, 'Lay the page flat in good light, filling the frame.');
      if (!source) {
        if (images.length === 0) return null;
        break;
      }
      const uri = await captureOne(source);
      if (uri) images.push(uri);
      const more = await new Promise<boolean>((resolve) => {
        Alert.alert(`${images.length} page${images.length === 1 ? '' : 's'} so far`, 'Does this document have another page?', [
          { text: 'No, done', onPress: () => resolve(false) },
          { text: 'Add a page', onPress: () => resolve(true) },
        ]);
      });
      if (!more) break;
    }
    if (images.length === 0) return null;
  }
  return imagesToPdf(images);
}

/** Rough page count of a PDF (counts its page objects). Good enough for
 * "3 pages" in a list; falls back to 1. */
async function countPdfPages(uri: string): Promise<number> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const text = atob(base64);
    const n = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    return Math.min(Math.max(n, 1), 30);
  } catch {
    return 1;
  }
}

/** A PDF the customer already has — e.g. the Purchase Order their
 * salesperson sent on WhatsApp (saved to Files from WhatsApp first). */
export async function pickPdf(): Promise<ScannedPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  return { uri, pageCount: await countPdfPages(uri) };
}
