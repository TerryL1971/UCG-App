import ExpoModulesCore
import PDFKit
import UIKit
import Vision

/// Reads the text on a deal document, entirely on the phone (Apple's
/// Vision framework, free, nothing leaves the device).
///
/// - A PDF with real text inside (DealerTeam's Purchase Order, Cost
///   Estimate, Bill of Sale) is read directly, with no OCR.
/// - A scanned PDF or a photo is read with OCR.
///
/// Returns the text as lines, top to bottom.
public class UcgNativeModule: Module {
  private static let maxPages = 6

  public func definition() -> ModuleDefinition {
    Name("UcgNative")

    AsyncFunction("readText") { (uri: String) -> [String] in
      let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
      if url.pathExtension.lowercased() == "pdf" {
        return try Self.readPdf(url)
      }
      guard let image = UIImage(contentsOfFile: url.path), let cgImage = image.cgImage else {
        throw Exception(name: "ERR_UNREADABLE", description: "Couldn't open the image.")
      }
      return try Self.recognize(cgImage, orientation: Self.orientation(image.imageOrientation))
    }
  }

  private static func readPdf(_ url: URL) throws -> [String] {
    guard let document = PDFDocument(url: url) else {
      throw Exception(name: "ERR_UNREADABLE", description: "Couldn't open the PDF.")
    }
    var lines: [String] = []
    for index in 0..<min(document.pageCount, maxPages) {
      guard let page = document.page(at: index) else { continue }
      // Text inside the PDF: exact, so prefer it.
      if let text = page.string, text.trimmingCharacters(in: .whitespacesAndNewlines).count > 40 {
        lines += text.components(separatedBy: .newlines)
        continue
      }
      // A scan: draw the page and read it.
      let bounds = page.bounds(for: .mediaBox)
      let scale = 2400 / max(bounds.width, bounds.height, 1)
      let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
      if let cgImage = page.thumbnail(of: size, for: .mediaBox).cgImage {
        lines += try recognize(cgImage, orientation: .up)
      }
    }
    return lines.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
  }

  private static func recognize(_ image: CGImage, orientation: CGImagePropertyOrientation) throws -> [String] {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    // Autocorrect "fixes" VINs and stock numbers into words. Off.
    request.usesLanguageCorrection = false
    try VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:]).perform([request])
    let observations = request.results ?? []

    // Group pieces that sit on the same row, so "Deal #   12345" stays
    // one line even when Vision returns the label and value separately.
    let sorted = observations.sorted { $0.boundingBox.midY > $1.boundingBox.midY }
    var rows: [[VNRecognizedTextObservation]] = []
    for observation in sorted {
      if let last = rows.last?.first,
         abs(last.boundingBox.midY - observation.boundingBox.midY) < last.boundingBox.height * 0.5 {
        rows[rows.count - 1].append(observation)
      } else {
        rows.append([observation])
      }
    }
    return rows.map { row in
      row.sorted { $0.boundingBox.minX < $1.boundingBox.minX }
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "   ")
    }
  }

  private static func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
