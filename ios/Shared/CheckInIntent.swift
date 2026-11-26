import AppIntents
import WidgetKit

/// Lets you check off today's questions straight from the home screen widget.
struct CheckInIntent: AppIntent {
    static var title: LocalizedStringResource = "Check in today's study"
    static var description = IntentDescription("Mark today's planned questions as done, half done or missed.")

    @Parameter(title: "Status") var status: String

    init() { status = "done" }
    init(status: String) { self.status = status }

    func perform() async throws -> some IntentResult {
        let current = PlanStore.load()?.status(Day.iso(Date()))?.rawValue
        // Tapping the same status again clears it.
        PlanStore.checkIn(current == status ? nil : CheckIn(rawValue: status))
        return .result()
    }
}
