import Foundation
import UserNotifications

/// Local reminders: a morning note with today's questions and an evening nudge to check in.
/// Built from the plan for the next 28 days, so they work offline. Re-made whenever the plan changes.
enum Reminders {
    static var morningOn: Bool { get { UserDefaults.standard.object(forKey: "rem_am") as? Bool ?? true } set { UserDefaults.standard.set(newValue, forKey: "rem_am") } }
    static var eveningOn: Bool { get { UserDefaults.standard.object(forKey: "rem_pm") as? Bool ?? true } set { UserDefaults.standard.set(newValue, forKey: "rem_pm") } }
    static var morning: DateComponents {
        get { comps("rem_am_t", h: 7, m: 30) } set { save(newValue, "rem_am_t") }
    }
    static var evening: DateComponents {
        get { comps("rem_pm_t", h: 20, m: 30) } set { save(newValue, "rem_pm_t") }
    }
    private static func comps(_ k: String, h: Int, m: Int) -> DateComponents {
        let a = UserDefaults.standard.array(forKey: k) as? [Int] ?? [h, m]; return DateComponents(hour: a[0], minute: a[1])
    }
    private static func save(_ c: DateComponents, _ k: String) { UserDefaults.standard.set([c.hour ?? 0, c.minute ?? 0], forKey: k) }

    static func requestPermission() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    static func reschedule() {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        guard let plan = PlanStore.load() else { return }
        let cal = Calendar.current, todayISO = Day.iso(Date())
        for day in plan.days where day.date >= todayISO && day.kind != "off" {
            let date = Day.date(day.date)
            guard let diff = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: date).day, diff < 28 else { continue }
            if morningOn { add(center, id: "am-\(day.date)", date: date, time: morning, title: headline(day), body: day.what) }
            if eveningOn && plan.status(day.date) == nil {
                add(center, id: "pm-\(day.date)", date: date, time: evening, title: "How did today go?", body: "Check in so your plan stays honest: done, half done or missed.")
            }
        }
    }

    /// Checking in today removes tonight's nudge.
    static func clearEvening(_ date: String = Day.iso(Date())) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["pm-\(date)"])
    }

    private static func headline(_ d: Day) -> String {
        switch d.kind {
        case "q": return "Today: \(d.n ?? 0) questions"
        case "form": return "Today: practice exam"
        case "review": return "Today: review day"
        default: return "Today's plan"
        }
    }

    private static func add(_ c: UNUserNotificationCenter, id: String, date: Date, time: DateComponents, title: String, body: String) {
        var dc = Calendar.current.dateComponents([.year, .month, .day], from: date)
        dc.hour = time.hour; dc.minute = time.minute
        guard let fire = Calendar.current.date(from: dc), fire > Date() else { return }
        let content = UNMutableNotificationContent(); content.title = title; content.body = body; content.sound = .default
        content.userInfo = ["open": "today"]
        c.add(UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)))
    }
}
