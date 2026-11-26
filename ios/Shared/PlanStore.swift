import Foundation
import WidgetKit

/// Keeps the plan in the shared App Group so the widget and the app read the same thing.
enum PlanStore {
    static let group = "group.com.myseniorresident.app"
    static var defaults: UserDefaults { UserDefaults(suiteName: group) ?? .standard }
    private static let key = "sr_plan_v2"

    static func load() -> Plan? {
        guard let d = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(Plan.self, from: d)
    }

    /// Saves locally, refreshes the widget, and marks the plan as needing a sync to the account.
    static func save(_ plan: Plan?, needsSync: Bool = true) {
        if var p = plan {
            p.saved = Date().timeIntervalSince1970 * 1000
            defaults.set(try? JSONEncoder().encode(p), forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
        if needsSync { defaults.set(true, forKey: "sr_plan_dirty") }
        WidgetCenter.shared.reloadAllTimelines()
    }

    static var dirty: Bool {
        get { defaults.bool(forKey: "sr_plan_dirty") }
        set { defaults.set(newValue, forKey: "sr_plan_dirty") }
    }

    /// Whether this person's plan includes the app's paid features. Written by the app, read by the widget.
    static var unlocked: Bool {
        get { defaults.object(forKey: "sr_unlocked") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "sr_unlocked"); WidgetCenter.shared.reloadAllTimelines() }
    }

    static func checkIn(_ status: CheckIn?, on date: String = Day.iso(Date())) {
        guard var p = load() else { return }
        if let s = status { p.log[date] = s.rawValue } else { p.log.removeValue(forKey: date) }
        save(p)
    }
}
