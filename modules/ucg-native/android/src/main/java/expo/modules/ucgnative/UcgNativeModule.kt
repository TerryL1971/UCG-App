package expo.modules.ucgnative

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads the text on a deal document on the phone (Google ML Kit, free,
 * offline). PDFs are drawn page by page and read; photos are read
 * directly. Returns lines, top to bottom.
 */
class UcgNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UcgNative")

    AsyncFunction("readText") { uri: String ->
      val context = appContext.reactContext ?: throw CodedException("No app context.")
      val parsed = Uri.parse(uri)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      try {
        if (uri.lowercase().endsWith(".pdf")) {
          val lines = mutableListOf<String>()
          val descriptor = context.contentResolver.openFileDescriptor(parsed, "r")
            ?: throw CodedException("Couldn't open the PDF.")
          val renderer = PdfRenderer(descriptor)
          try {
            for (index in 0 until minOf(renderer.pageCount, MAX_PAGES)) {
              val page = renderer.openPage(index)
              val scale = 2400f / maxOf(page.width, page.height)
              val bitmap = Bitmap.createBitmap(
                (page.width * scale).toInt(),
                (page.height * scale).toInt(),
                Bitmap.Config.ARGB_8888
              )
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              page.close()
              lines += recognize(recognizer, InputImage.fromBitmap(bitmap, 0))
              bitmap.recycle()
            }
          } finally {
            renderer.close()
            descriptor.close()
          }
          lines
        } else {
          recognize(recognizer, InputImage.fromFilePath(context, parsed))
        }
      } finally {
        recognizer.close()
      }
    }
  }

  private fun recognize(recognizer: TextRecognizer, image: InputImage): List<String> {
    val result = Tasks.await(recognizer.process(image))
    return result.textBlocks
      .flatMap { it.lines }
      .sortedWith(compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 }))
      .map { it.text.trim() }
      .filter { it.isNotEmpty() }
  }

  companion object {
    private const val MAX_PAGES = 6
  }
}
