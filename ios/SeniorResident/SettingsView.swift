import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var account: Account
    @State private var morningOn = Reminders.morningOn
    @State private var eveningOn = Reminders.eveningOn
    @State private var morning = Calendar.current.date(from: Reminders.morning) ?? Date()
    @State private var evening = Calendar.current.date(from: Reminders.evening) ?? Date()
    @State private var askDelete = false
    @State private var att = Attending.current

    var body: some View {
        NavigationStack {
            Form {
                if account.user == nil {
                    Section {
                        Button("Sign in or create an account") { account.showSignIn = true }
                    } footer: { Text("Signing in adds the coach and keeps your plan in step with the website.") }
                } else {
                Section {
                    HStack {
                        VStack(alignment: .leading) {
                            Text((account.user?.userMetadata["full_name"]?.stringValue) ?? "Signed in").font(.headline)
                            Text(account.user?.email ?? "").font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(account.tierName).font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Color.accentColor.opacity(0.15)).clipShape(Capsule())
                    }
                } footer: {
                    if Config.billingLive && !account.unlocked {
                        Text("The coach, photo import and widget check-ins are included with Resident and Chief.")
                    }
                }
                }
                Section {
                    Picker("Attending", selection: $att) {
                        ForEach(Attending.allCases) { a in Text(a.name).tag(a) }
                    }
                    .onChange(of: att) { _, v in Attending.current = v }
                } header: { Text("Who answers your pages") } footer: { Text(att.blurb + (att.givesAnswer ? " Gives you the answer if you ask outright." : " Never gives the answer away.")) }
                Section("Reminders") {
                    Toggle("Morning: today's questions", isOn: $morningOn)
                    if morningOn { DatePicker("Time", selection: $morning, displayedComponents: .hourAndMinute) }
                    Toggle("Evening: check in", isOn: $eveningOn)
                    if eveningOn { DatePicker("Time", selection: $evening, displayedComponents: .hourAndMinute) }
                }
                .onChange(of: [morningOn, eveningOn]) { _, _ in saveReminders() }
                .onChange(of: morning) { _, _ in saveReminders() }
                .onChange(of: evening) { _, _ in saveReminders() }
                Section("Widget") {
                    Label("Add the Today widget: press and hold your home screen, tap Edit, then Add Widget and pick My Senior Resident. It also works on the lock screen.", systemImage: "square.grid.2x2")
                        .font(.footnote)
                }
                Section {
                    Link("Privacy Policy", destination: Config.privacy)
                    Link("Terms of Use", destination: Config.terms)
                    Link("Contact us: hello@myseniorresident.com", destination: URL(string: "mailto:hello@myseniorresident.com")!)
                } footer: {
                    Text("Study aid only. Not medical advice. Not affiliated with any question bank, Anki or AnKing. Follow your question bank's own terms.")
                }
                if account.user != nil {
                Section {
                    Button("Sign out") { Task { await account.signOut() } }
                    Button("Delete my account", role: .destructive) { askDelete = true }
                }
                }
                if let e = account.error { Section { Text(e).foregroundStyle(.red).font(.footnote) } }
            }
            .navigationTitle("Account")
            .confirmationDialog("Delete your account, plan and history? This cannot be undone. An active subscription bought on the website is cancelled too.", isPresented: $askDelete, titleVisibility: .visible) {
                Button("Delete my account", role: .destructive) { Task { _ = await account.deleteAccount() } }
            }
        }
    }

    func saveReminders() {
        Reminders.morningOn = morningOn; Reminders.eveningOn = eveningOn
        Reminders.morning = Calendar.current.dateComponents([.hour, .minute], from: morning)
        Reminders.evening = Calendar.current.dateComponents([.hour, .minute], from: evening)
        Task { if morningOn || eveningOn { _ = await Reminders.requestPermission() }; Reminders.reschedule() }
    }
}
