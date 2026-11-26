import Foundation

/// The study plan. Same JSON shape the website saves in the account (user_metadata.sr_plan),
/// so a plan made on the phone shows up on the website and the other way round.
struct PlanOptions: Codable, Equatable {
    var ex: String = "NBME shelf"
    var subject: String = "Pediatrics"
    var start: String = Day.iso(Date())
    var exam: String = Day.iso(Calendar.current.date(byAdding: .day, value: 28, to: Date())!)
    var week: [Bool] = [true, true, true, true, true, true, true]   // Sunday first, like the website
    var forms: Int? = 4
    var review: Int? = 2
    var mode: String? = "systems"
    var bank: String? = "UWorld"
}

struct Topic: Codable, Equatable, Identifiable {
    var t: String
    var n: FlexInt
    var ok: Bool = true
    var id: String { t }
}

struct Day: Codable, Equatable, Identifiable {
    var date: String
    var study: Bool
    var kind: String = "q"          // q, form, review, rest, off
    var n: Int? = nil
    var what: String = ""
    var id: String { date }

    static let fmt: DateFormatter = {
        let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f
    }()
    static func iso(_ d: Date) -> String { fmt.string(from: d) }
    static func date(_ s: String) -> Date { fmt.date(from: s) ?? Date() }
    var nice: String { Day.date(date).formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()) }
}

enum CheckIn: String, Codable, CaseIterable { case done, half, miss
    var symbol: String { self == .done ? "checkmark" : self == .half ? "circle.lefthalf.filled" : "xmark" }
    var label: String { self == .done ? "Done" : self == .half ? "Half done" : "Missed" }
}

struct Plan: Codable, Equatable {
    var o: PlanOptions
    var recs: [Topic]
    var note: String? = ""
    var days: [Day]
    var warn: String? = ""
    var per: Int? = 0
    var total: Int? = 0
    var built: String? = Day.iso(Date())
    var log: [String: String] = [:]
    var saved: Double? = Date().timeIntervalSince1970 * 1000

    func status(_ date: String) -> CheckIn? { log[date].flatMap(CheckIn.init(rawValue:)) }
    var today: Day? { days.first { $0.date == Day.iso(Date()) } }

    /// Builds the days the same way the website does: questions split evenly in fives,
    /// then practice exams, then review days at the end.
    static func build(_ o: PlanOptions, _ recs: [Topic], note: String = "") -> Plan {
        var days: [Day] = []
        let cal = Calendar.current
        var d = Day.date(o.start); let exam = Day.date(o.exam)
        while d < exam {
            let wd = cal.component(.weekday, from: d) - 1
            days.append(Day(date: Day.iso(d), study: o.week[wd]))
            d = cal.date(byAdding: .day, value: 1, to: d)!
        }
        let studyIdx = days.indices.filter { days[$0].study }
        let review = min(o.review ?? 0, max(0, studyIdx.count - 1))
        let forms = min(o.forms ?? 0, max(0, studyIdx.count - review - 1))
        let keep = recs.filter { $0.ok && $0.n.value > 0 }
        let total = keep.reduce(0) { $0 + $1.n.value }
        var qDays = studyIdx.count - review - forms, warn = ""
        if qDays < 1 { qDays = 0; warn = "There are not enough study days for this. Move the exam date, add study days, or use fewer practice exams." }
        let units = Int((Double(total) / 5).rounded(.up))
        let baseU = qDays > 0 ? units / qDays : 0, extraU = qDays > 0 ? units - baseU * qDays : 0
        let per = qDays > 0 ? (baseU + (extraU > 0 ? 1 : 0)) * 5 : 0
        if per > 120 { warn = "That is about \(per) questions a day. Consider more study days or fewer questions." }
        var queue = keep.map { ($0.t, $0.n.value) }, remaining = total, fi = 0
        for (i, di) in studyIdx.enumerated() {
            if i < qDays {
                let n = min(remaining, (baseU + (i < extraU ? 1 : 0)) * 5); remaining -= n
                days[di].kind = "q"; days[di].n = n
                if o.mode == "random" || queue.isEmpty { days[di].what = "\(n) mixed questions, random and timed" }
                else {
                    var parts: [String] = [], need = n
                    while need > 0, !queue.isEmpty {
                        let take = min(queue[0].1, need); parts.append("\(take) \(queue[0].0)")
                        queue[0].1 -= take; need -= take; if queue[0].1 == 0 { queue.removeFirst() }
                    }
                    days[di].what = parts.joined(separator: ", ")
                }
                if n == 0 { days[di].kind = "rest"; days[di].what = "Catch up or rest" }
            } else if i < qDays + forms {
                fi += 1; days[di].kind = "form"; days[di].what = "Practice exam \(fi), then review every question"
            } else { days[di].kind = "review"; days[di].what = "Review only: misses, flagged topics, light questions" }
        }
        for i in days.indices where !days[i].study { days[i].kind = "off"; days[i].what = "Day off" }
        return Plan(o: o, recs: recs, note: note, days: days, warn: warn, per: per, total: total)
    }

    struct Stats { var done = 0, total = 0, due = 0, left = 0, need = 0, daysLeft = 0, forms = 0, formsDone = 0, streak = 0, diff = 0; var status = "On track" }
    var stats: Stats {
        let today = Day.iso(Date()); var s = Stats()
        let q = days.filter { $0.kind == "q" }
        s.total = q.reduce(0) { $0 + ($1.n ?? 0) }
        s.due = q.filter { $0.date < today }.reduce(0) { $0 + ($1.n ?? 0) }
        s.done = q.reduce(0) { a, x in
            switch status(x.date) { case .done: return a + (x.n ?? 0); case .half: return a + (x.n ?? 0) / 2; default: return a }
        }
        s.left = max(0, s.total - s.done)
        s.daysLeft = q.filter { $0.date >= today }.count
        s.need = s.daysLeft > 0 ? Int((Double(s.left) / Double(s.daysLeft) / 5).rounded(.up)) * 5 : 0
        let f = days.filter { $0.kind == "form" }; s.forms = f.count; s.formsDone = f.filter { status($0.date) == .done }.count
        for x in days.reversed() where x.date < today && x.kind != "off" { if status(x.date) == .done { s.streak += 1 } else { break } }
        s.diff = s.done - s.due
        s.status = s.diff >= 0 ? (s.diff >= 20 ? "Ahead" : "On track") : "Behind"
        return s
    }

    /// Missed days: push the remaining question days down from today, same questions, same exam date.
    mutating func shiftFromToday() {
        let today = Day.iso(Date())
        let undone = days.filter { $0.kind == "q" && $0.date < today && status($0.date) != .done }
        guard !undone.isEmpty else { return }
        var o2 = o; o2.start = today
        var recs2: [Topic] = []
        for x in days where x.kind == "q" && (x.date >= today || status(x.date) != .done) {
            for part in x.what.components(separatedBy: ", ") {
                let bits = part.split(separator: " ", maxSplits: 1)
                if bits.count == 2, let n = Int(bits[0]) {
                    let name = String(bits[1])
                    if let i = recs2.firstIndex(where: { $0.t == name }) { recs2[i].n = FlexInt(recs2[i].n.value + n) }
                    else { recs2.append(Topic(t: name, n: FlexInt(n))) }
                }
            }
        }
        let past = days.filter { $0.date < today }
        var next = Plan.build(o2, recs2.isEmpty ? recs : recs2, note: note ?? "")
        next.days = past + next.days; next.log = log; next.o.start = o.start; next.recs = recs
        self = next
    }
}

/// The website sometimes stores counts as text ("30"). Accept both.
struct FlexInt: Codable, Equatable {
    var value: Int
    init(_ v: Int) { value = v }
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let i = try? c.decode(Int.self) { value = i }
        else if let d = try? c.decode(Double.self) { value = Int(d) }
        else if let s = try? c.decode(String.self) { value = Int(s.trimmingCharacters(in: .whitespaces)) ?? 0 }
        else { value = 0 }
    }
    func encode(to encoder: Encoder) throws { var c = encoder.singleValueContainer(); try c.encode(value) }
}

/// Recommended starting topics per exam, from the published content outlines (same list as the website).
enum Outlines {
    static let exams: [String: [String: [(String, Double)]]] = [
        "NBME shelf": [
            "Pediatrics": [("Multisystem processes", 12.5), ("Gastrointestinal", 10), ("Nervous system and special senses", 7.5), ("Cardiovascular", 7.5), ("Respiratory", 7.5), ("Renal and urinary", 7.5), ("Newborn and congenital", 7.5), ("Endocrine", 7.5)],
            "Internal Medicine": [("Cardiovascular", 12.5), ("Multisystem processes", 12.5), ("Blood and lymphoreticular", 7.5), ("Respiratory", 7.5), ("Gastrointestinal", 7.5), ("Renal and urinary", 7.5), ("Endocrine", 7.5), ("Immune", 3)],
            "Surgery": [("Gastrointestinal", 22.5), ("Cardiovascular", 12.5), ("Respiratory", 10), ("Blood and lymphoreticular", 7.5), ("Nervous system and special senses", 7.5), ("Multisystem processes (trauma, shock)", 7.5), ("Musculoskeletal", 5)],
            "Obstetrics and Gynecology": [("Obstetrics", 42.5), ("Gynecology", 42.5), ("Other systems and multisystem", 7.5), ("General principles", 3)],
            "Psychiatry": [("Behavioural health", 67.5), ("Nervous system and special senses", 12.5), ("General principles", 7.5), ("Other systems", 7.5)],
            "Family Medicine": [("General principles and well patient", 7.5), ("Behavioural health", 7.5), ("Musculoskeletal", 7.5), ("Cardiovascular", 7.5), ("Respiratory", 7.5), ("Gastrointestinal", 7.5), ("Endocrine", 7.5)],
        ],
        "USMLE Step 1": ["All systems": [("Reproductive and endocrine", 14), ("Respiratory and renal", 13), ("Behavioural health and nervous system", 12), ("Blood, lymphoreticular and immune", 11), ("Musculoskeletal and skin", 10), ("Multisystem processes", 10)]],
        "USMLE Step 2 CK": ["All systems": [("Ethics and patient safety", 12.5), ("Renal, urinary and reproductive", 10), ("Cardiovascular", 9), ("Musculoskeletal and skin", 9), ("Behavioural health", 7.5), ("Blood, lymphoreticular and immune", 7.5)]],
        "MCCQE Part I": ["All subjects": [("Medicine", 0), ("Surgery", 0), ("Pediatrics", 0), ("Obstetrics and gynecology", 0), ("Psychiatry", 0), ("Population health and ethics", 0)]],
    ]
    static func topics(_ ex: String, _ subject: String, total: Int) -> [Topic] {
        let list = exams[ex]?[subject] ?? []
        let sum = max(1, list.reduce(0) { $0 + $1.1 })
        return list.map { Topic(t: $0.0, n: FlexInt(total > 0 && $0.1 > 0 ? Int((Double(total) * $0.1 / sum / 5).rounded()) * 5 : 0)) }
    }
}
