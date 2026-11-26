import UIKit
import Vision

/// Reads a photo of a question bank's subject list (for example UWorld's Create Test screen)
/// on the phone itself and pulls out each subject with its question count. Nothing is uploaded.
enum SubjectScanner {
    static func read(_ image: UIImage) async -> [Topic] {
        guard let cg = image.cgImage else { return [] }
        let lines: [String] = await withCheckedContinuation { cont in
            let req = VNRecognizeTextRequest { r, _ in
                let obs = (r.results as? [VNRecognizedTextObservation]) ?? []
                // keep reading order: top to bottom, then left to right
                let sorted = obs.sorted { a, b in
                    abs(a.boundingBox.midY - b.boundingBox.midY) > 0.01 ? a.boundingBox.midY > b.boundingBox.midY : a.boundingBox.minX < b.boundingBox.minX
                }
                cont.resume(returning: sorted.compactMap { $0.topCandidates(1).first?.string })
            }
            req.recognitionLevel = .accurate
            req.usesLanguageCorrection = true
            try? VNImageRequestHandler(cgImage: cg, orientation: .init(image.imageOrientation)).perform([req])
        }
        return parse(lines)
    }

    /// "Cardiovascular System (120)", "Cardiovascular System 120", or a name line followed by a count line.
    static func parse(_ lines: [String]) -> [Topic] {
        var out: [Topic] = [], pendingName: String?
        let skip = ["subjects", "systems", "select all", "question mode", "unused", "incorrect", "marked", "omitted", "correct", "all", "test mode", "tutor", "timed", "create test", "number of questions"]
        let pattern = try! NSRegularExpression(pattern: #"^(.*?[A-Za-z][A-Za-z ,&/'()\-]*?)\s*[\(\[]?\s*(\d{1,4})\s*[\)\]]?\s*$"#)
        for raw in lines {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "☐", with: "").replacingOccurrences(of: "☑", with: "")
            if line.isEmpty { continue }
            let lower = line.lowercased()
            if skip.contains(where: { lower.hasPrefix($0) }) { pendingName = nil; continue }
            let r = NSRange(line.startIndex..., in: line)
            if let m = pattern.firstMatch(in: line, range: r),
               let nr = Range(m.range(at: 1), in: line), let cr = Range(m.range(at: 2), in: line), let n = Int(line[cr]) {
                let name = clean(String(line[nr]))
                if name.count >= 3 { add(&out, name, n) } else if let p = pendingName { add(&out, p, n) }
                pendingName = nil
            } else if let n = Int(line.trimmingCharacters(in: CharacterSet(charactersIn: "()[] "))), let p = pendingName {
                add(&out, p, n); pendingName = nil
            } else if line.rangeOfCharacter(from: .letters) != nil, line.count < 60 {
                pendingName = clean(line)
            }
        }
        return out
    }

    private static func clean(_ s: String) -> String {
        s.trimmingCharacters(in: CharacterSet(charactersIn: " -:•·()[]")).replacingOccurrences(of: "  ", with: " ")
    }
    private static func add(_ out: inout [Topic], _ name: String, _ n: Int) {
        guard n > 0, n < 5000 else { return }
        if let i = out.firstIndex(where: { $0.t.caseInsensitiveCompare(name) == .orderedSame }) { out[i].n = FlexInt(n) }
        else { out.append(Topic(t: name, n: FlexInt(n))) }
    }
}

extension CGImagePropertyOrientation {
    init(_ o: UIImage.Orientation) {
        switch o {
        case .up: self = .up; case .down: self = .down; case .left: self = .left; case .right: self = .right
        case .upMirrored: self = .upMirrored; case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored; case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
