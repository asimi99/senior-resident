import SwiftUI
import PhotosUI

struct CoachView: View {
    @EnvironmentObject var account: Account
    @StateObject private var coach = Coach()
    @State private var images: [UIImage] = []
    @State private var text = ""
    @State private var level = UserDefaults.standard.string(forKey: "sr_level") ?? "guided"
    @State private var showCamera = false
    @State private var picks: [PhotosPickerItem] = []
    @State private var stepIndex = 0
    @State private var chosen: [Int: Int] = [:]
    @State private var ruled: Set<String> = []          // answer choices ruled out correctly (green)
    @State private var crossed: [Int: Set<Int>] = [:]   // keep-in-play choices the student crossed out anyway (orange)
    @State private var pageOpen = false
    @State private var pageText = ""
    @State private var askText = ""
    @State private var saved = false
    @State private var showPearls = false

    var body: some View {
        NavigationStack {
            Group {
                if account.user == nil { signedOut }
                else if !account.unlocked { locked }
                else if coach.steps.isEmpty && !coach.busy { input }
                else { session }
            }
            .navigationTitle(coach.title.isEmpty ? "Coach" : coach.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showPearls = true } label: { Label("Pearls", systemImage: "sparkles") }
                }
                if !coach.steps.isEmpty || coach.busy {
                    ToolbarItem(placement: .topBarTrailing) { Button("New question") { reset() } }
                }
            }
            .sheet(isPresented: $showCamera) { CameraPicker { images.append($0) }.ignoresSafeArea() }
            .sheet(isPresented: $showPearls) { PearlsView() }
            .onChange(of: picks) { _, items in
                Task {
                    for i in items { if let d = try? await i.loadTransferable(type: Data.self), let img = UIImage(data: d) { images.append(img) } }
                    picks = []
                }
            }
        }
    }

    var signedOut: some View {
        ContentUnavailableView {
            Label("Sign in to use the coach", systemImage: "stethoscope")
        } description: {
            Text("Photograph a practice question and get walked to the answer one decision at a time. Your plan, widget and reminders work without an account.")
        } actions: {
            Button("Sign in or create an account") { account.showSignIn = true }.buttonStyle(.borderedProminent)
        }
    }

    var locked: some View {
        ContentUnavailableView {
            Label("Coaching is part of Resident and Chief", systemImage: "stethoscope")
        } description: {
            Text("Your study plan, widget and reminders are free. Coaching from a photo is included with the Resident and Chief plans.")
        }
    }

    var input: some View {
        Form {
            Section {
                Picker("Difficulty", selection: $level) {
                    Text("Guided").tag("guided"); Text("Harder").tag("harder"); Text("Hardest").tag("hardest")
                }
                .pickerStyle(.segmented)
                .onChange(of: level) { _, v in UserDefaults.standard.set(v, forKey: "sr_level") }
            } footer: {
                Text(level == "guided" ? "Hints on every step, clear right and wrong options." : level == "harder" ? "No hints, every wrong option is a real look-alike." : "Exam pace. Starts at the hard decision, close options, no giveaways.")
            }
            Section {
                HStack {
                    Button { showCamera = true } label: { Label("Take a photo", systemImage: "camera") }
                    Spacer()
                    PhotosPicker(selection: $picks, maxSelectionCount: 4, matching: .images) { Label("Screenshots", systemImage: "photo.on.rectangle") }
                }.buttonStyle(.borderless)
                if !images.isEmpty {
                    ScrollView(.horizontal) {
                        HStack { ForEach(images.indices, id: \.self) { i in
                            Image(uiImage: images[i]).resizable().scaledToFill().frame(width: 80, height: 100).clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(alignment: .topTrailing) {
                                    Button { images.remove(at: i) } label: { Image(systemName: "xmark.circle.fill").symbolRenderingMode(.hierarchical) }.padding(2)
                                }
                        } }
                    }
                }
                TextField("Or paste the question and its answer choices", text: $text, axis: .vertical).lineLimit(4...10)
            } header: { Text("The question") } footer: {
                Text("Photograph a question from any question bank, textbook or practice exam. Leave out patient names and other identifying details.")
            }
            if let e = coach.error { Section { Text(e).foregroundStyle(.red) } }
            Section {
                Button { start() } label: { Text("Start coaching").frame(maxWidth: .infinity) }
                    .buttonStyle(.borderedProminent).disabled(images.isEmpty && text.count < 20)
            }
        }
    }

    var session: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if coach.steps.indices.contains(stepIndex) {
                    let s = coach.steps[stepIndex]
                    HStack {
                        Text("STEP \(stepIndex + 1)\(coach.busy ? "" : " OF \(coach.steps.count)")").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                        Spacer()
                        if s.type == "elim" || s.type == "final" { Text("ELIMINATION").font(.caption.weight(.semibold)).foregroundStyle(.secondary) }
                    }
                    Text(s.q ?? "").font(.title3.weight(.bold))
                    if let sub = s.sub, !sub.isEmpty, level != "hardest" { Text(sub).font(.subheadline).foregroundStyle(.secondary) }
                    ForEach(Array(s.opts.enumerated()), id: \.offset) { i, o in optionRow(s, i, o) }
                    if let pick = chosen[stepIndex], s.opts.indices.contains(pick), let fb = s.opts[pick].fb {
                        let v = s.opts[pick].v
                        VStack(alignment: .leading, spacing: 4) {
                            Text(v == "good" ? (isElim(s) ? "RULED OUT" : "ON TRACK") : v == "warn" ? "KEEP IN PLAY" : "NOT QUITE")
                                .font(.caption.weight(.bold)).foregroundStyle(tone(v))
                            Text(fb).font(.subheadline)
                        }
                        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                        .background(tone(v).opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    if isElim(s) && !s.opts.isEmpty { Text("Tap and hold a choice to cross it out yourself.").font(.caption).foregroundStyle(.secondary) }
                    pageBox
                    Divider().padding(.vertical, 2)
                    if let hold = holdMessage(s) { Text(hold).font(.footnote.weight(.medium)).foregroundStyle(.orange) }
                    HStack {
                        Button("Back") { stepIndex -= 1; pageOpen = false }.buttonStyle(.bordered).disabled(stepIndex == 0)
                        Spacer()
                        if !(isLast && s.type == "final" && solved(s)) {
                            Button("Continue") { stepIndex += 1; pageOpen = false }
                                .buttonStyle(.borderedProminent)
                                .disabled(!canContinue(s) || stepIndex >= coach.steps.count - 1)
                        }
                    }
                    if isLast && s.type == "final" && solved(s) { done }
                }
                if coach.busy && stepIndex >= coach.steps.count - 1 {
                    HStack { ProgressView(); Text(coach.steps.isEmpty ? "Reading the question" : "Preparing the next step").foregroundStyle(.secondary) }
                }
                if let e = coach.error { Text(e).foregroundStyle(.red) }
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }

    /// After the last rule-out: the pearl, saving it, and questions for the attending.
    var done: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("One choice left. Pick it in your question bank.", systemImage: "checkmark.seal.fill").font(.headline).foregroundStyle(.green)
            if let p = coach.pearl {
                VStack(alignment: .leading, spacing: 6) {
                    Text("PEARL").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                    Text(p).font(.body.weight(.semibold))
                    Button(saved ? "Saved to pearls" : "Save pearl") { Pearls.add(p, topic: coach.topic); saved = true }
                        .font(.footnote.weight(.semibold)).disabled(saved)
                }.padding(12).frame(maxWidth: .infinity, alignment: .leading).background(Color.accentColor.opacity(0.08)).clipShape(RoundedRectangle(cornerRadius: 12))
            }
            ForEach(coach.chat) { m in bubble(m) }
            if coach.answering && !pageOpen && !coach.live.isEmpty { bubble(ChatTurn(role: "assistant", content: coach.live)) }
            HStack(alignment: .bottom) {
                TextField("Still have a question? Page the attending", text: $askText, axis: .vertical).lineLimit(1...4).textFieldStyle(.roundedBorder)
                Button { let q = askText; askText = ""; Task { await coach.ask(q) } } label: { Image(systemName: "paperplane.fill") }
                    .buttonStyle(.borderedProminent).disabled(askText.trimmingCharacters(in: .whitespaces).isEmpty || coach.answering)
            }
            Button("Next question") { reset() }.buttonStyle(.borderedProminent).frame(maxWidth: .infinity)
        }
        .padding(.top, 6)
    }

    /// "Still stuck? Page the attending" for the current step.
    @ViewBuilder var pageBox: some View {
        let th = coach.pages[stepIndex] ?? []
        if !pageOpen && th.isEmpty {
            Button { pageOpen = true } label: {
                Label { Text("**Still stuck?** Page the attending") } icon: { Image(systemName: "antenna.radiowaves.left.and.right") }
                    .font(.subheadline).padding(.vertical, 8).padding(.horizontal, 14)
                    .overlay(Capsule().strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundStyle(.secondary))
            }.buttonStyle(.plain)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("Paging \(Attending.current.name.lowercased())").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                ForEach(th) { m in bubble(m) }
                if coach.answering && pageOpen && !coach.live.isEmpty { bubble(ChatTurn(role: "assistant", content: coach.live)) }
                HStack(alignment: .bottom) {
                    TextField("What is confusing you on this step?", text: $pageText, axis: .vertical).lineLimit(1...4).textFieldStyle(.roundedBorder)
                    Button {
                        let m = pageText; pageText = ""; pageOpen = true
                        let s = coach.steps[stepIndex]
                        let picked = chosen[stepIndex].flatMap { s.opts.indices.contains($0) ? s.opts[$0] : nil }
                        Task { await coach.page(step: stepIndex, picked: picked, message: m) }
                    } label: { Image(systemName: "paperplane.fill") }
                        .buttonStyle(.borderedProminent).disabled(pageText.trimmingCharacters(in: .whitespaces).isEmpty || coach.answering)
                }
            }
            .padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    func bubble(_ m: ChatTurn) -> some View {
        HStack {
            if m.role == "user" { Spacer(minLength: 40) }
            Text(m.content).font(.subheadline).padding(10)
                .background(m.role == "user" ? Color.accentColor.opacity(0.15) : Color(.tertiarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            if m.role != "user" { Spacer(minLength: 40) }
        }
    }

    @ViewBuilder func optionRow(_ s: CoachStep, _ i: Int, _ o: CoachOption) -> some View {
        let picked = chosen[stepIndex] == i
        let isRuled = ruled.contains(o.t)
        let isCrossed = crossed[stepIndex]?.contains(i) ?? false
        Button {
            UISelectionFeedbackGenerator().selectionChanged()
            if isElim(s) && o.v == "good" { if isRuled { ruled.remove(o.t) } else { ruled.insert(o.t) } }
            chosen[stepIndex] = picked ? nil : i
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Text(letter(o, i)).font(.footnote.weight(.bold)).frame(width: 24, height: 24)
                    .background(Color(.systemBackground)).clipShape(RoundedRectangle(cornerRadius: 6))
                Text(stripLetter(o.t)).strikethrough(isRuled || isCrossed).frame(maxWidth: .infinity, alignment: .leading)
                    .foregroundStyle(isRuled ? .secondary : .primary)
            }
            .padding(14)
            .background(picked ? tone(o.v).opacity(0.16) : Color(.secondarySystemBackground))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(picked ? tone(o.v) : .clear, lineWidth: 1.2))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .opacity(isRuled ? 0.6 : 1)
        }
        .buttonStyle(.plain)
        .contextMenu {
            if isElim(s) {
                Button(isCrossed || isRuled ? "Uncross" : "Cross out", systemImage: "strikethrough") {
                    if o.v == "good" { if isRuled { ruled.remove(o.t) } else { ruled.insert(o.t) } }
                    else { var c = crossed[stepIndex] ?? []; if c.contains(i) { c.remove(i) } else { c.insert(i) }; crossed[stepIndex] = c; chosen[stepIndex] = i }
                }
            }
        }
    }

    var isLast: Bool { stepIndex == coach.steps.count - 1 && !coach.busy }
    func isElim(_ s: CoachStep) -> Bool { s.type == "elim" || s.type == "final" }
    func tone(_ v: String) -> Color { v == "good" ? .green : v == "warn" ? .orange : .red }
    func letter(_ o: CoachOption, _ i: Int) -> String {
        if let f = o.t.first, f.isLetter, o.t.dropFirst().hasPrefix(".") { return String(f) }
        return String(UnicodeScalar(65 + i).map(Character.init) ?? "•")
    }
    func stripLetter(_ t: String) -> String {
        if let f = t.first, f.isLetter, t.dropFirst().hasPrefix(". ") { return String(t.dropFirst(3)) }
        return t
    }
    /// Eliminating a choice the coach said to keep in play does not move you on.
    func holdMessage(_ s: CoachStep) -> String? {
        guard s.type == "elim" else { return nil }
        if !(crossed[stepIndex] ?? []).isEmpty { return "Uncross the orange choice to continue. The stem keeps it in play." }
        if let p = chosen[stepIndex], s.opts.indices.contains(p), s.opts[p].v != "good", !s.opts.contains(where: { ruled.contains($0.t) }) {
            return "Rule out a choice the stem excludes to continue."
        }
        return nil
    }
    func canContinue(_ s: CoachStep) -> Bool {
        if s.type == "elim" { return holdMessage(s) == nil && s.opts.contains { $0.v == "good" && ruled.contains($0.t) } }
        if s.type == "final" { return solved(s) }
        return chosen[stepIndex] != nil
    }
    func solved(_ s: CoachStep) -> Bool { s.opts.filter { $0.v == "good" }.allSatisfy { ruled.contains($0.t) } }
    func start() {
        stepIndex = 0; chosen = [:]; ruled = []; crossed = [:]; saved = false; pageOpen = false
        Task { await coach.run(images: images, text: text, level: level) }
    }
    func reset() {
        coach.reset(); images = []; text = ""; stepIndex = 0; chosen = [:]; ruled = []; crossed = [:]; saved = false; pageOpen = false; askText = ""; pageText = ""
    }
}

struct PearlsView: View {
    @Environment(\.dismiss) var dismiss
    @State private var items = Pearls.all
    @State private var q = ""
    var body: some View {
        NavigationStack {
            List {
                if items.isEmpty {
                    ContentUnavailableView("No pearls yet", systemImage: "sparkles", description: Text("Finish a coached question and save its pearl. It shows up here."))
                }
                ForEach(filtered) { p in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(p.text)
                        Text([p.topic, p.date.formatted(date: .abbreviated, time: .omitted)].filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .onDelete { idx in let ids = idx.map { filtered[$0].id }; items.removeAll { ids.contains($0.id) }; Pearls.all = items }
            }
            .searchable(text: $q, prompt: "Search pearls")
            .navigationTitle("Pearls")
            .toolbar { Button("Done") { dismiss() } }
        }
    }
    var filtered: [Pearls.Item] { q.isEmpty ? items : items.filter { $0.text.localizedCaseInsensitiveContains(q) || $0.topic.localizedCaseInsensitiveContains(q) } }
}
