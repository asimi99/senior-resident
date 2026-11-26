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
    @State private var ruled: Set<String> = []

    var body: some View {
        NavigationStack {
            Group {
                if !account.unlocked { locked }
                else if coach.steps.isEmpty && !coach.busy { input }
                else { session }
            }
            .navigationTitle(coach.title.isEmpty ? "Coach" : coach.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !coach.steps.isEmpty || coach.busy {
                    Button("New question") { reset() }
                }
            }
            .sheet(isPresented: $showCamera) { CameraPicker { images.append($0) }.ignoresSafeArea() }
            .onChange(of: picks) { _, items in
                Task {
                    for i in items { if let d = try? await i.loadTransferable(type: Data.self), let img = UIImage(data: d) { images.append(img) } }
                    picks = []
                }
            }
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
                Button { stepIndex = 0; chosen = [:]; ruled = []; Task { await coach.run(images: images, text: text, level: level) } } label: {
                    Text("Start coaching").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).disabled(images.isEmpty && text.count < 20)
            }
        }
    }

    var session: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if coach.steps.indices.contains(stepIndex) {
                    let s = coach.steps[stepIndex]
                    Text("STEP \(stepIndex + 1)").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    Text(s.q ?? "").font(.title3.weight(.bold))
                    if let sub = s.sub, !sub.isEmpty, level != "hardest" { Text(sub).font(.subheadline).foregroundStyle(.secondary) }
                    ForEach(Array(s.opts.enumerated()), id: \.offset) { i, o in optionRow(s, i, o) }
                    if let pick = chosen[stepIndex], s.opts.indices.contains(pick), let fb = s.opts[pick].fb {
                        Text(fb).font(.subheadline).padding(12).frame(maxWidth: .infinity, alignment: .leading)
                            .background((s.opts[pick].v == "good" ? Color.green : s.opts[pick].v == "warn" ? Color.yellow : Color.red).opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    HStack {
                        Button("Back") { stepIndex -= 1 }.disabled(stepIndex == 0)
                        Spacer()
                        if solved(s) && stepIndex == coach.steps.count - 1 && s.type == "final" {
                            if let p = coach.pearl { Text(p).font(.subheadline.weight(.semibold)) }
                        } else {
                            Button("Continue") { stepIndex += 1 }
                                .buttonStyle(.borderedProminent)
                                .disabled(!canContinue(s) || stepIndex >= coach.steps.count - 1)
                        }
                    }.padding(.top, 6)
                }
                if coach.busy && stepIndex >= coach.steps.count - 1 {
                    HStack { ProgressView(); Text(coach.steps.isEmpty ? "Reading the question" : "Preparing the next step").foregroundStyle(.secondary) }
                }
                if let e = coach.error { Text(e).foregroundStyle(.red) }
            }
            .padding()
        }
    }

    @ViewBuilder func optionRow(_ s: CoachStep, _ i: Int, _ o: CoachOption) -> some View {
        let picked = chosen[stepIndex] == i, isRuled = ruled.contains(o.t)
        Button {
            UISelectionFeedbackGenerator().selectionChanged()
            if s.type == "elim" || s.type == "final" {
                if o.v == "good" { if isRuled { ruled.remove(o.t) } else { ruled.insert(o.t) } }
            }
            chosen[stepIndex] = picked ? nil : i
        } label: {
            Text(o.t).strikethrough(isRuled).frame(maxWidth: .infinity, alignment: .leading).padding(14)
                .background(picked ? (o.v == "good" ? Color.green : o.v == "warn" ? Color.yellow : Color.red).opacity(0.18) : Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }.buttonStyle(.plain)
    }

    func canContinue(_ s: CoachStep) -> Bool { chosen[stepIndex] != nil || s.opts.contains { ruled.contains($0.t) } }
    func solved(_ s: CoachStep) -> Bool { s.opts.filter { $0.v == "good" }.allSatisfy { ruled.contains($0.t) } }
    func reset() { coach.steps = []; coach.pearl = nil; coach.title = ""; images = []; text = ""; stepIndex = 0; chosen = [:]; ruled = [] }
}
