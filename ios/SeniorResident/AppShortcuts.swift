import AppIntents

struct SeniorResidentShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: CheckInIntent(status: "done"),
                    phrases: ["Mark today done in \(.applicationName)", "I finished my questions in \(.applicationName)"],
                    shortTitle: "Today done", systemImageName: "checkmark.circle")
    }
}
