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
struct ChatTurn: Identifiable, Equatable, Codable {
    var id = UUID()
    var role: String          // user or assistant
    var content: String
}

/// Which attending answers a page. Same three as the website.
enum Attending: String, CaseIterable, Identifiable {
    case teach, busy, old
    var id: String { rawValue }
    var name: String { self == .teach ? "Loves to teach" : self == .busy ? "Busy on rounds" : "Old school" }
    var blurb: String { self == .teach ? "Warm. Walks you through the why." : self == .busy ? "Direct. A sentence or two." : "Blunt. Makes you work for it." }
    static var current: Attending {
        get { Attending(rawValue: UserDefaults.standard.string(forKey: "sr_att") ?? "busy") ?? .busy }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "sr_att") }
    }
    func style(again: Bool) -> String {
        switch self {
        case .teach: return "STYLE: an attending who loves to teach. Warm and encouraging. 3 to 5 sentences, 90 words at most. Answer the question, explain the why behind it in plain words, and point to the stem clue."
        case .old: return "STYLE: an old-school attending with no time. Blunt and dry, never insulting and never demeaning. ONE sentence, 20 words at most" + (again ? ", or two short sentences if the student has paged before" : "") + "."
        case .busy: return "STYLE: a busy attending on rounds. Direct and neutral. 1 to 3 short sentences, 45 words at most" + (again ? ", up to 60 if the student has paged before" : "") + ". One idea only."
        }
    }
    /// The first two hand over the answer when asked outright. Old school never does.
    var givesAnswer: Bool { self != .old }
}

/// Saved pearls, kept on the phone.
enum Pearls {
    struct Item: Codable, Identifiable, Equatable { var id = UUID(); var text: String; var topic: String; var date: Date }
    static var all: [Item] {
        get { (UserDefaults.standard.data(forKey: "sr_pearls")).flatMap { try? JSONDecoder().decode([Item].self, from: $0) } ?? [] }
        set { UserDefaults.standard.set(try? JSONEncoder().encode(newValue), forKey: "sr_pearls") }
    }
    static func add(_ text: String, topic: String) {
        guard !text.isEmpty, !all.contains(where: { $0.text == text }) else { return }
        all.insert(Item(text: text, topic: topic, date: Date()), at: 0)
    }
}

/// One id per install. The server counts free allowances per install as well as per account.
enum DeviceID {
    static var value: String {
        if let v = UserDefaults.standard.string(forKey: "sr_dev") { return v }
        let v = UUID().uuidString; UserDefaults.standard.set(v, forKey: "sr_dev"); return v
    }
}

/// Talks to the same server function as the website. The server checks the person's plan and limits.
@MainActor
final class Coach: ObservableObject {
    @Published var steps: [CoachStep] = []
    @Published var title = ""
    @Published var pearl: String?
    @Published var topic = ""
    @Published var busy = false
    @Published var error: String?
    @Published var chat: [ChatTurn] = []               // questions to the attending after the reveal
    @Published var pages: [Int: [ChatTurn]] = [:]      // pages to the attending while stuck on a step
    @Published var live = ""                           // the attending's reply as it streams
    @Published var answering = false

    private(set) var stemSummary = ""
    private(set) var options: [String] = []
    private(set) var headline = ""

    private let rules: String
    private let levels: [String: String]
    private let spell: String

    init() {
        struct R: Decodable { let rules: String; let levels: [String: String]; let spellCA: String }
        let url = Bundle.main.url(forResource: "coach", withExtension: "json")!
        let r = try! JSONDecoder().decode(R.self, from: Data(contentsOf: url))
        rules = r.rules; levels = r.levels; spell = r.spellCA
    }

    func reset() {
        steps = []; pearl = nil; title = ""; topic = ""; error = nil; chat = []; pages = [:]; live = ""
        stemSummary = ""; options = []; headline = ""
    }

    func run(images: [UIImage], text: String, level: String) async {
        reset(); busy = true
        defer { busy = false }
        var prompt = rules.replacingOccurrences(of: "{{REGION}}", with: "If Canadian practice differs from the exam answer, say so in the feedback. ")
            .replacingOccurrences(of: "{{SPELL}}", with: spell)
        if let l = levels[level], !l.isEmpty { prompt += "\n" + l }
        prompt += "\n\nINPUT: " + (images.isEmpty ? "No images." : "\(images.count) image(s) are attached.")
        if !text.isEmpty { prompt += "\nTyped question text from the student:\n" + text }

        let imgs = images.prefix(4).compactMap { img -> [String: String]? in
            guard let d = img.resizedForUpload().jpegData(compressionQuality: 0.8) else { return nil }
            return ["data": d.base64EncodedString(), "media_type": "image/jpeg"]
        }
        var buffer = "", consumed = 0
        let ok = await stream(input: prompt, kind: "coach", images: imgs) { [weak self] t in
            guard let self else { return }
            buffer += t
            let parts = buffer.components(separatedBy: "\n")
            while consumed < parts.count - 1 { self.handle(parts[consumed]); consumed += 1 }
        }
        buffer.components(separatedBy: "\n").dropFirst(consumed).forEach(handle)
        if ok && steps.isEmpty && error == nil { error = "The coach could not read that. Try a clearer photo." }
    }

    private func handle(_ raw: String) {
        let line = raw.trimmingCharacters(in: .whitespaces)
        guard line.hasPrefix("{"), let d = line.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return }
        switch obj["kind"] as? String {
        case "meta":
            title = obj["title"] as? String ?? ""
            stemSummary = obj["stemSummary"] as? String ?? ""
            options = obj["options"] as? [String] ?? []
        case "step":
            if var s = try? JSONDecoder().decode(CoachStep.self, from: d) {
                if s.type == "elim" { s.q = "Which answer choice can you eliminate first?"; s.sub = "Pick the one you are most sure the stem rules out." }
                s.opts = s.opts.filter { $0.t.count > 3 }
                if s.opts.count >= 2 { steps.append(s) }
            }
        case "reveal":
            pearl = obj["pearl"] as? String
            topic = obj["topic"] as? String ?? ""
            headline = obj["headline"] as? String ?? ""
        case "error": error = obj["message"] as? String ?? "The coach could not read that."
        default: break
        }
    }

    private var context: String { "Question summary: \(stemSummary)\nAnswer choices: \(options.joined(separator: " | "))" }

    /// A follow-up question once the student has finished the question.
    func ask(_ q: String) async {
        let att = Attending.current
        chat.append(ChatTurn(role: "user", content: q))
        let rules = "You are the attending on call for a medical student who just worked through a coached question and now has a follow-up. Answer the exact question as a page back: no greeting, no lists. "
            + att.style(again: chat.count > 2)
            + (att.givesAnswer
               ? " Teach the reasoning and point to the stem clue. Do not volunteer which answer choice is correct. If the student asks you directly and explicitly for the answer, tell them plainly in one sentence, using the private key, with the one stem clue that decides it. "
               : " NEVER state which answer choice is correct, never give its letter, and never say \"the answer is\". If they ask directly for the answer, tell them it is the one choice they did not rule out and to check it in their question bank. ")
            + spell + " No em dashes or semicolons. No markdown.\n\n" + context + "\nPrivate key, never reveal it unless allowed above: " + headline
        let turns = [ChatTurn(role: "user", content: rules)] + chat.suffix(8)
        let reply = await reply(turns)
        chat.append(ChatTurn(role: "assistant", content: reply))
    }

    /// A page while stuck on one step. It never names the right option unless the student asks outright (and the attending allows it).
    func page(step i: Int, picked: CoachOption?, message: String) async {
        guard steps.indices.contains(i) else { return }
        let att = Attending.current, s = steps[i]
        var th = pages[i] ?? []
        let before = th.filter { $0.role == "assistant" }.count
        th.append(ChatTurn(role: "user", content: message)); pages[i] = th
        let right = s.opts.first { $0.v == "good" }?.t ?? "unknown"
        let rules = "You are the attending physician on a teaching service. A medical student working through an exam question one step at a time is stuck on a step and has paged you. Reply as a page back: no greeting, no sign-off, no markdown, no lists.\n"
            + att.style(again: before > 0) + "\n"
            + (att.givesAnswer
               ? "Do not volunteer the diagnosis, the correct answer choice, or which option of this step is right. But if the student asks you directly and explicitly for the answer, give it plainly in one sentence with the stem clue that decides it. Right option on this step: \(right). Private key for the question: \(headline)\n"
               : "NEVER name the diagnosis, the correct answer choice, or which option of this step is right. The student must still make the decision.\n")
            + "Answer the exact question the student asked, first and directly. Use the stem to do it. "
            + (before == 0 ? "Then, if it helps, point to the one stem finding worth a second look." : "The student has paged before on this step, so be more explicit: name the concept behind this step. Still do not say which option is right unless allowed above.")
            + "\n" + spell + " No em dashes or semicolons.\n\n" + context
            + "\nCurrent step asks: \(s.q ?? "")\nOptions on this step: " + s.opts.map(\.t).joined(separator: " | ")
            + (picked.map { "\nThe student last picked: \($0.t) (\($0.v == "good" ? "which is right" : "which is not right"))" } ?? "\nThe student has not picked yet.")
        var turns = [ChatTurn(role: "user", content: rules + "\n\nStudent page: " + th[0].content)] + th.dropFirst().suffix(6)
        if turns.last?.role != "user" { turns.append(ChatTurn(role: "user", content: message)) }
        let reply = await reply(turns)
        th.append(ChatTurn(role: "assistant", content: reply)); pages[i] = th
    }

    private func reply(_ turns: [ChatTurn]) async -> String {
        answering = true; live = ""
        defer { answering = false; live = "" }
        var text = ""
        let payload: [[String: String]] = turns.map { ["role": $0.role, "content": $0.content] }
        let ok = await stream(input: payload, kind: "aux", images: []) { [weak self] t in text += t; self?.live = text }
        let out = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return ok && !out.isEmpty ? out : (error ?? "Could not answer that right now. Try again in a moment.")
    }

    /// Streams text from the server function. Returns false and sets `error` on failure.
    private func stream(input: Any, kind: String, images: [[String: String]], onText: @escaping (String) -> Void) async -> Bool {
        var body: [String: Any] = ["input": input, "tier": "default", "kind": kind, "app": "sr-ios", "dev": DeviceID.value]
        if !images.isEmpty { body["images"] = images }
        var req = URLRequest(url: Config.supabaseURL.appendingPathComponent("functions/v1/resident"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(Config.supabaseKey, forHTTPHeaderField: "apikey")
        let token = (try? await supabase.auth.session.accessToken) ?? Config.supabaseKey
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        do {
            let (bytes, resp) = try await URLSession.shared.bytes(for: req)
            let http = resp as? HTTPURLResponse
            if http?.statusCode == 429 {
                error = http?.value(forHTTPHeaderField: "x-sr-period") == "month"
                    ? "That is this month's limit. It resets on the first of the month."
                    : "That is today's limit. It resets at midnight."
                return false
            }
            guard http?.statusCode == 200 else { error = "The coach could not answer that. Try again."; return false }
            for try await line in bytes.lines {
                guard line.hasPrefix("data: "), let d = line.dropFirst(6).data(using: .utf8),
                      let ev = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                      ev["type"] as? String == "content_block_delta",
                      let delta = ev["delta"] as? [String: Any], let t = delta["text"] as? String else { continue }
                onText(t)
            }
            return true
        } catch { self.error = "No connection. Try again."; return false }
    }
}

extension UIImage {
    func resizedForUpload(maxSide: CGFloat = 1600) -> UIImage {
        let s = max(size.width, size.height); guard s > maxSide else { return self }
        let k = maxSide / s, ns = CGSize(width: size.width * k, height: size.height * k)
        return UIGraphicsImageRenderer(size: ns).image { _ in draw(in: CGRect(origin: .zero, size: ns)) }
    }
}
