import SwiftUI
import PhotosUI

struct PlanView: View {
    @EnvironmentObject var model: PlanModel
    @State private var building = false
    @State private var askDelete = false

    var body: some View {
        NavigationStack {
            Group {
                if let p = model.plan {
                    List {
                        if let w = p.warn, !w.isEmpty { Section { Label(w, systemImage: "exclamationmark.triangle").font(.footnote) } }
                        ForEach(weeks(p), id: \.0) { wk in
                            Section(wk.0) {
                                ForEach(wk.1) { d in DayRow(day: d, status: p.status(d.date)) }
                            }
                        }
                    }
                } else {
                    ContentUnavailableView {
                        Label("No plan yet", systemImage: "calendar")
                    } actions: { Button("Build my plan") { building = true }.buttonStyle(.borderedProminent) }
                }
            }
            .navigationTitle(model.plan.map { $0.o.subject.hasPrefix("All") ? $0.o.ex : $0.o.subject } ?? "Plan")
            .toolbar {
                if model.plan != nil {
                    Menu {
                        Button("Edit my plan", systemImage: "pencil") { building = true }
                        Button("Delete plan", systemImage: "trash", role: .destructive) { askDelete = true }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
            .sheet(isPresented: $building) { BuilderView(existing: model.plan) }
            .confirmationDialog("Delete this plan and its check-ins? This cannot be undone.", isPresented: $askDelete, titleVisibility: .visible) {
                Button("Delete plan", role: .destructive) { model.save(nil) }
            }
        }
    }

    func weeks(_ p: Plan) -> [(String, [Day])] {
        var out: [(String, [Day])] = [], cal = Calendar.current
        cal.firstWeekday = 2
        for d in p.days {
            let start = cal.dateInterval(of: .weekOfYear, for: Day.date(d.date))?.start ?? Day.date(d.date)
            let key = "Week of " + start.formatted(.dateTime.month(.abbreviated).day())
            if out.last?.0 == key { out[out.count - 1].1.append(d) } else { out.append((key, [d])) }
        }
        return out
    }
}

struct DayRow: View {
    @EnvironmentObject var model: PlanModel
    let day: Day, status: CheckIn?
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading) {
                Text(day.nice).font(.subheadline.weight(day.date == Day.iso(Date()) ? .bold : .regular))
                Text(day.what).font(.footnote).foregroundStyle(day.kind == "off" ? .secondary : .primary)
            }
            Spacer()
            if day.kind != "off" {
                Menu {
                    ForEach(CheckIn.allCases, id: \.self) { s in Button(s.label, systemImage: s.symbol) { model.checkIn(s, day.date) } }
                    if status != nil { Button("Clear", systemImage: "arrow.uturn.backward") { model.checkIn(nil, day.date) } }
                } label: {
                    Image(systemName: status?.symbol ?? "circle.dashed")
                        .foregroundStyle(status == .done ? .green : status == .half ? .yellow : status == .miss ? .red : .secondary)
                        .font(.title3).frame(width: 34, height: 34)
                }
                .accessibilityLabel(status?.label ?? "Not checked in")
            }
        }
        .listRowBackground(day.date == Day.iso(Date()) ? Color.accentColor.opacity(0.08) : nil)
    }
}

/// Build or edit a plan. The subject list can come from a photo of the question bank.
struct BuilderView: View {
    @EnvironmentObject var model: PlanModel
    @EnvironmentObject var account: Account
    @Environment(\.dismiss) private var dismiss
    var existing: Plan? = nil

    @State private var o = PlanOptions()
    @State private var topics: [Topic] = []
    @State private var bankTotal = ""
    @State private var note = ""
    @State private var showCamera = false
    @State private var photo: PhotosPickerItem?
    @State private var scanning = false
    @State private var scanMsg: String?

    private let dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    private var subjects: [String] { (Outlines.exams[o.ex] ?? [:]).keys.sorted() }

    var body: some View {
        NavigationStack {
            Form {
                Section("Exam") {
                    Picker("Exam", selection: $o.ex) {
                        ForEach(Outlines.exams.keys.sorted(), id: \.self) { Text($0) }
                        Text("Other").tag("Other")
                    }
                    if subjects.count > 1 { Picker("Subject", selection: $o.subject) { ForEach(subjects, id: \.self) { Text($0) } } }
                    else if o.ex == "Other" { TextField("Exam name", text: $o.subject) }
                    TextField("Question bank", text: Binding($o.bank, ""))
                }
                Section("Dates") {
                    DatePicker("Start", selection: dateBinding(\.start), displayedComponents: .date)
                    DatePicker("Exam", selection: dateBinding(\.exam), in: Date()..., displayedComponents: .date)
                    HStack {
                        ForEach(0..<7, id: \.self) { i in
                            Button(dayNames[i].prefix(1)) { o.week[i].toggle() }
                                .frame(maxWidth: .infinity, minHeight: 34)
                                .background(o.week[i] ? Color.accentColor : Color(.tertiarySystemFill))
                                .foregroundStyle(o.week[i] ? .white : .primary)
                                .clipShape(Circle()).buttonStyle(.plain)
                                .accessibilityLabel("\(dayNames[i]) \(o.week[i] ? "study day" : "day off")")
                        }
                    }
                    Stepper("Practice exams: \(o.forms ?? 0)", value: Binding($o.forms, 0), in: 0...12)
                    Stepper("Review days at the end: \(o.review ?? 0)", value: Binding($o.review, 0), in: 0...10)
                }
                Section {
                    if account.unlocked {
                        HStack {
                            Button { showCamera = true } label: { Label("Take a photo", systemImage: "camera") }
                            Spacer()
                            PhotosPicker(selection: $photo, matching: .images) { Label("Screenshot", systemImage: "photo") }
                        }
                        .buttonStyle(.borderless)
                    } else {
                        Label("Photo import is part of Resident and Chief.", systemImage: "lock").font(.footnote).foregroundStyle(.secondary)
                    }
                    if scanning { ProgressView("Reading the subjects") }
                    if let m = scanMsg { Text(m).font(.footnote).foregroundStyle(.secondary) }
                    ForEach($topics) { $t in
                        HStack {
                            Toggle("", isOn: $t.ok).labelsHidden()
                            TextField("Subject", text: $t.t)
                            TextField("0", value: $t.n.value, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 60)
                        }
                    }
                    .onDelete { topics.remove(atOffsets: $0) }
                    Button { topics.append(Topic(t: "", n: FlexInt(0))) } label: { Label("Add a subject", systemImage: "plus") }
                    if topics.isEmpty || topics.allSatisfy({ $0.n.value == 0 }) {
                        HStack {
                            TextField("Total questions to split", text: $bankTotal).keyboardType(.numberPad)
                            Button("Split by exam weights") { topics = Outlines.topics(o.ex, o.subject, total: Int(bankTotal) ?? 0) }
                                .disabled((Int(bankTotal) ?? 0) == 0)
                        }
                    }
                } header: { Text("Subjects and question counts") } footer: {
                    Text("Snap your question bank's subject list (for example UWorld's Create Test screen) and the counts fill in. The photo is read on your phone and never uploaded. Order here is the order you study them.")
                }
                Section("Anything else?") {
                    TextField("For example: start with cardio, put renal last", text: $note, axis: .vertical)
                }
            }
            .navigationTitle(existing == nil ? "New plan" : "Edit plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Build") { build() }.disabled(o.exam <= o.start || topics.allSatisfy { !$0.ok || $0.n.value == 0 })
                }
            }
            .sheet(isPresented: $showCamera) { CameraPicker { img in Task { await scan(img) } }.ignoresSafeArea() }
            .onChange(of: photo) { _, item in
                Task { if let d = try? await item?.loadTransferable(type: Data.self), let img = UIImage(data: d) { await scan(img) } }
            }
            .onChange(of: o.ex) { _, ex in
                let subs = (Outlines.exams[ex] ?? [:]).keys.sorted()
                if !subs.contains(o.subject) { o.subject = subs.first ?? "" }
            }
            .onAppear {
                if let e = existing { o = e.o; topics = e.recs; note = e.note ?? "" }
                else if o.start.isEmpty { o.start = Day.iso(Date()) }
            }
        }
    }

    func dateBinding(_ kp: WritableKeyPath<PlanOptions, String>) -> Binding<Date> {
        Binding(get: { Day.date(o[keyPath: kp]) }, set: { o[keyPath: kp] = Day.iso($0) })
    }

    func scan(_ img: UIImage) async {
        scanning = true; scanMsg = nil
        let found = await SubjectScanner.read(img)
        scanning = false
        if found.isEmpty { scanMsg = "Could not find subjects with counts in that photo. Try a straight-on photo of the subject list."; return }
        for f in found {
            if let i = topics.firstIndex(where: { $0.t.caseInsensitiveCompare(f.t) == .orderedSame }) { topics[i].n = f.n } else { topics.append(f) }
        }
        topics.removeAll { $0.t.isEmpty && $0.n.value == 0 }
        scanMsg = "Found \(found.count) subjects, \(found.reduce(0) { $0 + $1.n.value }) questions. Untick any you will skip."
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func build() {
        var recs = topics.filter { !$0.t.trimmingCharacters(in: .whitespaces).isEmpty }
        // plain-words order: "start with X", "X last", "skip X"
        for part in note.lowercased().split(whereSeparator: { ",.;\n".contains($0) }).map(String.init) {
            guard let i = recs.firstIndex(where: { part.contains($0.t.lowercased().split(separator: " ").first.map(String.init) ?? "~") }) else { continue }
            let hit = recs[i]
            if part.contains("skip") { recs[i].ok = false }
            else if part.contains("last") { recs.remove(at: i); recs.append(hit) }
            else if part.contains("first") || part.contains("start") { recs.remove(at: i); recs.insert(hit, at: 0) }
        }
        var p = Plan.build(o, recs, note: note)
        if let e = existing { p.log = e.log }
        model.save(p)
        Task { _ = await Reminders.requestPermission(); Reminders.reschedule(); await account.pushPlanIfNeeded() }
        dismiss()
    }
}

extension Binding {
    init<T>(_ source: Binding<T?>, _ fallback: T) where Value == T {
        self.init(get: { source.wrappedValue ?? fallback }, set: { source.wrappedValue = $0 })
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    var onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let p = UIImagePickerController()
        p.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        p.delegate = context.coordinator; return p
    }
    func updateUIViewController(_ vc: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> C { C(self) }
    final class C: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ p: CameraPicker) { parent = p }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let img = info[.originalImage] as? UIImage { parent.onImage(img) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
