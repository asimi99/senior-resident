import WidgetKit
import SwiftUI
import AppIntents

struct TodayEntry: TimelineEntry {
    let date: Date
    let day: Day?
    let status: CheckIn?
    let daysToExam: Int?
    let onTrack: String?
    let unlocked: Bool
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: .now, day: Day(date: Day.iso(.now), study: true, kind: "q", n: 30, what: "30 Cardiovascular"), status: nil, daysToExam: 21, onTrack: "On track", unlocked: true)
    }
    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) { completion(entry()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let midnight = Calendar.current.startOfDay(for: Calendar.current.date(byAdding: .day, value: 1, to: .now)!)
        completion(Timeline(entries: [entry()], policy: .after(midnight)))
    }
    private func entry() -> TodayEntry {
        let plan = PlanStore.load()
        let today = Day.iso(.now)
        let toExam = plan.map { Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: .now), to: Day.date($0.o.exam)).day ?? 0 }
        return TodayEntry(date: .now, day: plan?.today, status: plan?.status(today), daysToExam: toExam, onTrack: plan?.stats.status, unlocked: PlanStore.unlocked)
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TodayEntry

    var title: String {
        guard let d = entry.day else { return "No plan yet" }
        if d.kind == "q", let n = d.n { return "\(n) questions" }
        if d.kind == "form" { return "Practice exam" }
        if d.kind == "review" { return "Review day" }
        return "Day off"
    }

    var body: some View {
        content.containerBackground(.fill.tertiary, for: .widget)
    }

    @ViewBuilder var content: some View {
        switch family {
        case .accessoryInline:
            Text(entry.day == nil ? "My Senior Resident" : "\(title) today")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("TODAY").font(.caption2.weight(.semibold))
                Text(title).font(.headline)
                Text(entry.day?.what ?? "Open the app to build your plan").font(.caption2).lineLimit(1)
            }
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                if let s = entry.status { Image(systemName: s.symbol).font(.title3) }
                else { Text("\(entry.day?.n ?? 0)").font(.title3.weight(.bold)) }
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Today").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    Spacer()
                    if let d = entry.daysToExam { Text("\(d)d to exam").font(.caption2).foregroundStyle(.secondary) }
                }
                Text(title).font(.title3.weight(.bold))
                Text(entry.day?.what ?? "Open My Senior Resident to build your study plan.")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(family == .systemSmall ? 3 : 2)
                Spacer(minLength: 0)
                if entry.day != nil && entry.day?.kind != "off" {
                    if family == .systemSmall {
                        if let s = entry.status { Label(s.label, systemImage: s.symbol).font(.caption.weight(.semibold)) }
                        else if let t = entry.onTrack { Text(t).font(.caption.weight(.semibold)) }
                    } else {
                        HStack(spacing: 8) {
                            ForEach(CheckIn.allCases, id: \.self) { s in
                                Button(intent: CheckInIntent(status: s.rawValue)) {
                                    Label(s.label, systemImage: s.symbol).labelStyle(.iconOnly)
                                        .frame(maxWidth: .infinity, minHeight: 30)
                                }
                                .tint(entry.status == s ? .accentColor : .gray)
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SRToday", provider: TodayProvider()) { e in
            TodayWidgetView(entry: e).widgetURL(URL(string: "seniorresident://today"))
        }
        .configurationDisplayName("Today's questions")
        .description("What your study plan has for today, with check-in.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline, .accessoryCircular])
    }
}

@main
struct SeniorResidentWidgets: WidgetBundle {
    var body: some Widget { TodayWidget() }
}
