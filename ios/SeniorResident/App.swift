import SwiftUI
import UserNotifications

@main
struct SeniorResidentApp: App {
    @StateObject private var account = Account()
    @StateObject private var model = PlanModel()
    @Environment(\.scenePhase) private var phase
    @State private var tab = 0

    var body: some Scene {
        WindowGroup {
            Group {
                if !account.checked { ProgressView() }
                else if account.user == nil && !account.guest { SignInView() }
                else {
                    TabView(selection: $tab) {
                        TodayView().tabItem { Label("Today", systemImage: "sun.max") }.tag(0)
                        PlanView().tabItem { Label("Plan", systemImage: "calendar") }.tag(1)
                        CoachView().tabItem { Label("Coach", systemImage: "stethoscope") }.tag(2)
                        SettingsView().tabItem { Label("Account", systemImage: "person.crop.circle") }.tag(3)
                    }
                    .sheet(isPresented: $account.showSignIn) { SignInView() }
                }
            }
            .environmentObject(account)
            .environmentObject(model)
            .tint(Color("AccentColor"))
            .onOpenURL { url in
                if url.host == "today" { tab = 0 } else { Task { try? await supabase.auth.session(from: url) } }
            }
            .onChange(of: phase) { _, p in
                if p == .active { model.reload(); Task { await account.pullPlan(); model.reload(); await account.refreshTier() } }
                if p == .background { Task { await account.pushPlanIfNeeded() } }
            }
        }
    }
}

/// The plan the screens show. Reads and writes the shared store so the widget stays in step.
@MainActor
final class PlanModel: ObservableObject {
    @Published var plan: Plan? = PlanStore.load()
    func reload() { plan = PlanStore.load() }
    func save(_ p: Plan?) { PlanStore.save(p); plan = p; Reminders.reschedule() }
    func checkIn(_ s: CheckIn?, _ date: String) {
        PlanStore.checkIn(s, on: date); reload()
        if date == Day.iso(Date()) && s != nil { Reminders.clearEvening() }
    }
}
