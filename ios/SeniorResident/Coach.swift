import UIKit
import Supabase

/// One coaching step, the same JSON the website's coach streams.
struct CoachOption: Decodable, Identifiable, Equatable {
    var t: String; var v: String; var fb: String?
    var id: String { t }
}
struct CoachStep: Decodable, Identifiable, Equatable {
    var type: String
    var skill: String?
    var q: String?
    var sub: String?
    var opts: [CoachOption]
    var id: String { (q ?? type) + opts.map(\.t).joined() }
}

/// Talks to the same server function as the website. The server checks the person's plan and daily limits.
@MainActor
final class Coach: ObservableObject {
    @Published var steps: [CoachStep] = []
    @Published var title = ""
    @Published var pearl: String?
    @Published var busy = false
    @Published var error: String?

    private let rules: String
    private let levels: [String: String]
    private let spell: String

    init() {
        struct R: Decodable { let rules: String; let levels: [String: String]; let spellCA: String }
        let url = Bundle.main.url(forResource: "coach", withExtension: "json")!
        let r = try! JSONDecoder().decode(R.self, from: Data(contentsOf: url))
        rules = r.rules; levels = r.levels; spell = r.spellCA
    }

    func run(images: [UIImage], text: String, level: String) async {
        steps = []; pearl = nil; title = ""; error = nil; busy = true
        defer { busy = false }
        var prompt = rules.replacingOccurrences(of: "{{REGION}}", with: "If Canadian practice differs from the exam answer, say so in the feedback. ")
            .replacingOccurrences(of: "{{SPELL}}", with: spell)
        if let l = levels[level] { prompt += "\n" + l }
        prompt += "\n\nINPUT: " + (images.isEmpty ? "No images." : "\(images.count) image(s) are attached.")
        if !text.isEmpty { prompt += "\nTyped question text from the student:\n" + text }

        var body: [String: Any] = ["input": prompt, "tier": "default", "kind": "coach", "app": "sr-ios"]
        body["images"] = images.prefix(4).compactMap { img -> [String: String]? in
            guard let d = img.resizedForUpload().jpegData(compressionQuality: 0.8) else { return nil }
            return ["data": d.base64EncodedString(), "media_type": "image/jpeg"]
        }
        var req = URLRequest(url: Config.supabaseURL.appendingPathComponent("functions/v1/resident"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(Config.supabaseKey, forHTTPHeaderField: "apikey")
        let token = (try? await supabase.auth.session.accessToken) ?? Config.supabaseKey
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (bytes, resp) = try await URLSession.shared.bytes(for: req)
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if code == 429 { error = "That is today's limit. It resets at midnight."; return }
            if code != 200 { error = "The coach could not read that. Try a clearer photo."; return }
            var text = "", consumed = 0
            for try await line in bytes.lines {
                guard line.hasPrefix("data: "), let d = line.dropFirst(6).data(using: .utf8),
                      let ev = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                      ev["type"] as? String == "content_block_delta",
                      let delta = ev["delta"] as? [String: Any], let t = delta["text"] as? String else { continue }
                text += t
                let parts = text.components(separatedBy: "\n")
                while consumed < parts.count - 1 { handle(parts[consumed]); consumed += 1 }
            }
            text.components(separatedBy: "\n").dropFirst(consumed).forEach(handle)
            if steps.isEmpty { error = "The coach could not read that. Try a clearer photo." }
        } catch { self.error = "No connection. Try again." }
    }

    private func handle(_ raw: String) {
        let line = raw.trimmingCharacters(in: .whitespaces)
        guard line.hasPrefix("{"), let d = line.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return }
        switch obj["kind"] as? String {
        case "meta": title = obj["title"] as? String ?? ""
        case "step":
            if var s = try? JSONDecoder().decode(CoachStep.self, from: d) {
                if s.type == "elim" { s.q = "Which answer choice can you rule out first?"; s.sub = "Pick the one the stem rules out." }
                s.opts = s.opts.filter { $0.t.count > 3 }
                if s.opts.count >= 2 { steps.append(s) }
            }
        case "reveal": pearl = obj["pearl"] as? String
        case "error": error = obj["message"] as? String ?? "The coach could not read that."
        default: break
        }
    }
}

extension UIImage {
    func resizedForUpload(maxSide: CGFloat = 1600) -> UIImage {
        let s = max(size.width, size.height); guard s > maxSide else { return self }
        let k = maxSide / s, ns = CGSize(width: size.width * k, height: size.height * k)
        return UIGraphicsImageRenderer(size: ns).image { _ in draw(in: CGRect(origin: .zero, size: ns)) }
    }
}
