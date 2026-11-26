import SwiftUI

struct TodayView: View {
    @EnvironmentObject var model: PlanModel
    @EnvironmentObject var account: Account
    @State private var building = false

    var body: some View {
        NavigationStack {
            ScrollView {
                if let p = model.plan { content(p) } else { empty }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Today")
            .sheet(isPresented: $building) { BuilderView() }
        }
    }

    var empty: some View {
        VStack(spacing: 14) {
            Image(systemName: "calendar.badge.plus").font(.system(size: 48)).foregroundStyle(.tint).padding(.top, 60)
            Text("Build your study plan").font(.title2.weight(.bold))
            Text("Pick your exam and date, snap your question bank's subject list, and get a day-by-day plan with a home screen widget and reminders.")
                .multilineTextAlignment(.center).foregroundStyle(.secondary).padding(.horizontal)
            Button("Build my plan") { building = true }.buttonStyle(.borderedProminent).controlSize(.large)
        }.padding()
    }

    @ViewBuilder func content(_ p: Plan) -> some View {
        let s = p.stats, todayISO = Day.iso(Date())
        let toExam = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Day.date(p.o.exam)).day ?? 0
        VStack(spacing: 14) {
            HStack {
                StatTile(value: "\(max(0, toExam))", label: "days to exam")
                StatTile(value: "\(s.done)", label: "of \(s.total) done")
                StatTile(value: "\(s.formsDone)/\(s.forms)", label: "practice exams")
            }
            if let t = p.today {
                VStack(alignment: .leading, spacing: 10) {
                    Text(t.nice.uppercased()).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    Text(t.kind == "q" ? "\(t.n ?? 0) questions" : t.kind == "form" ? "Practice exam" : t.kind == "review" ? "Review day" : "Day off")
                        .font(.title.weight(.bold))
                    Text(t.what).foregroundStyle(.secondary)
                    if t.kind != "off" { CheckInRow(date: t.date) }
                }
                .frame(maxWidth: .infinity, alignment: .leading).card()
            } else {
                Text(todayISO < p.o.start ? "Your plan starts \(Day(date: p.o.start, study: true).nice)." : "Your plan has finished. Good luck on the exam.")
                    .frame(maxWidth: .infinity).card()
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(s.status).font(.headline).foregroundStyle(s.diff < 0 ? .orange : .green)
                Text(s.diff < 0 ? "\(abs(s.diff)) questions behind. About \(s.need) a day finishes on time." :
                        s.diff > 0 ? "\(s.diff) questions ahead of the plan." : "Exactly where the plan expected.")
                    .font(.subheadline).foregroundStyle(.secondary)
                ProgressView(value: Double(s.done), total: Double(max(1, s.total)))
                if s.streak > 1 { Label("\(s.streak) day streak", systemImage: "flame.fill").font(.footnote).foregroundStyle(.orange) }
                if s.diff < 0 {
                    Button("Shift the rest of the plan from today") { var q = p; q.shiftFromToday(); model.save(q) }
                        .font(.footnote.weight(.semibold)).padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading).card()
            NextDays(plan: p)
        }
        .padding()
    }
}

struct CheckInRow: View {
    @EnvironmentObject var model: PlanModel
    let date: String
    var body: some View {
        let cur = model.plan?.status(date)
        HStack(spacing: 8) {
            ForEach(CheckIn.allCases, id: \.self) { s in
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    model.checkIn(cur == s ? nil : s, date)
                } label: {
                    Label(s.label, systemImage: s.symbol).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 40)
                }
                .buttonStyle(.bordered)
                .tint(cur == s ? (s == .done ? .green : s == .half ? .yellow : .red) : .gray)
            }
        }
    }
}

struct NextDays: View {
    let plan: Plan
    var body: some View {
        let today = Day.iso(Date())
        let next = plan.days.filter { $0.date > today }.prefix(5)
        if !next.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Coming up").font(.headline)
                ForEach(Array(next)) { d in
                    HStack(alignment: .top) {
                        Text(d.nice).font(.subheadline.monospacedDigit()).frame(width: 96, alignment: .leading).foregroundStyle(.secondary)
                        Text(d.what).font(.subheadline)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading).card()
        }
    }
}

struct StatTile: View {
    let value: String, label: String
    var body: some View {
        VStack(spacing: 2) {
            Text(value).font(.title2.weight(.bold).monospacedDigit())
            Text(label).font(.caption).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity).padding(.vertical, 12).background(Color(.secondarySystemGroupedBackground)).clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

extension View {
    func card() -> some View { padding(16).background(Color(.secondarySystemGroupedBackground)).clipShape(RoundedRectangle(cornerRadius: 16)) }
}
