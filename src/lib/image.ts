import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Downscales a picked/captured photo before it ever sits in state — phone
 * camera photos are commonly 3000px+ on a side and several MB each, which
 * doesn't matter for one photo but adds up fast across 8-10+ (the actual
 * dealership workflow this is built for). Resizing the dimensions, not
 * just lowering JPEG quality, is what actually gets the file size down —
 * quality alone on a huge image is still a huge file.
 *
 * 1024px on the long side is small enough to keep a batch of photos light,
 * while still being enough resolution to make out condition/damage — the
 * whole point of these photos. Tune WIDTH down further if that's still
 * too big in practice.
 */
const RESIZE_WIDTH = 1024;
const COMPRESS_QUALITY = 0.6;

export async function compressPhoto(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    const rendered = await context.resize({ width: RESIZE_WIDTH }).renderAsync();
    const result = await rendered.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // If manipulation fails for some reason, fall back to the original
    // rather than losing the photo entirely.
    return uri;
  }
}
