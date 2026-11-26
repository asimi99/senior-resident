import Foundation
import AuthenticationServices
import CryptoKit
import Supabase

let supabase = SupabaseClient(
    supabaseURL: Config.supabaseURL,
    supabaseKey: Config.supabaseKey,
    options: SupabaseClientOptions(auth: .init(redirectToURL: Config.redirect))
)

/// Signed-in person, their plan tier, and syncing the study plan with the website.
@MainActor
final class Account: ObservableObject {
    @Published var user: User?
    @Published var tier: String = "free"          // free, resident, chief, trial
    @Published var checked = false
    @Published var error: String?

    static let termsVersion = "2026-11-24"

    /// The coach, the photo scan and the widget check-ins are part of Resident and Chief.
    var unlocked: Bool { !Config.billingLive || tier != "free" }
    var tierName: String { tier == "chief" ? "Chief" : tier == "resident" ? "Resident" : tier == "trial" ? "Resident trial" : "Free" }

    init() {
        Task {
            for await (_, session) in supabase.auth.authStateChanges {
                self.user = session?.user
                self.checked = true
                if session != nil { await self.refreshTier(); await self.pullPlan() }
                else { self.tier = "free" }
            }
        }
    }

    // MARK: sign in

    func signIn(email: String, password: String) async {
        error = nil
        do { try await supabase.auth.signIn(email: email, password: password) }
        catch { self.error = "That email and password do not match." }
    }

    func signUp(name: String, email: String, password: String) async {
        error = nil
        do {
            try await supabase.auth.signUp(email: email, password: password, data: [
                "full_name": .string(name),
                "terms_version": .string(Self.termsVersion),
                "terms_accepted_at": .string(ISO8601DateFormatter().string(from: Date())),
            ])
        } catch { self.error = error.localizedDescription }
    }

    func signInWithGoogle() async {
        error = nil
        do { try await supabase.auth.signInWithOAuth(provider: .google) }
        catch { self.error = "Google sign-in did not finish. Try again." }
    }

    private var nonce = ""
    func appleRequest(_ request: ASAuthorizationAppleIDRequest) {
        nonce = UUID().uuidString + UUID().uuidString
        request.requestedScopes = [.fullName, .email]
        request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    func appleCompletion(_ result: Result<ASAuthorization, Error>) async {
        error = nil
        guard case .success(let auth) = result,
              let cred = auth.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken, let token = String(data: tokenData, encoding: .utf8) else {
            if case .failure(let e) = result, (e as? ASAuthorizationError)?.code == .canceled { return }
            error = "Apple sign-in did not finish. Try again."; return
        }
        do {
            try await supabase.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: token, nonce: nonce))
            if let n = cred.fullName, let given = n.givenName {
                let full = [given, n.familyName].compactMap { $0 }.joined(separator: " ")
                _ = try? await supabase.auth.update(user: UserAttributes(data: ["full_name": .string(full)]))
            }
        } catch { self.error = "Apple sign-in did not finish. Try again." }
    }

    func signOut() async { try? await supabase.auth.signOut() }

    /// Apple requires that people can delete their account inside the app.
    func deleteAccount() async -> Bool {
        do {
            try await supabase.functions.invoke("sr-delete-account")
            PlanStore.save(nil, needsSync: false)
            try? await supabase.auth.signOut()
            return true
        } catch { self.error = "Could not delete the account. Try again or contact hello@myseniorresident.com."; return false }
    }

    // MARK: plan tier

    struct Profile: Decodable { let plan: String?; let current_period_end: String? }
    func refreshTier() async {
        guard let uid = user?.id else { return }
        let p: Profile? = try? await supabase.from("sr_profiles").select("plan,current_period_end").eq("user_id", value: uid.uuidString).single().execute().value
        var t = p?.plan ?? "free"
        if let end = p?.current_period_end, let d = ISO8601DateFormatter().date(from: end) ?? DateFormatter.supabase.date(from: end), d < Date() { t = "free" }
        tier = t == "pro" ? "resident" : t
        PlanStore.unlocked = unlocked
    }

    // MARK: plan sync with the website (user_metadata.sr_plan)

    func pullPlan() async {
        guard let meta = try? await supabase.auth.user().userMetadata["sr_plan"],
              let data = try? JSONEncoder().encode(meta),
              let remote = try? JSONDecoder().decode(Plan.self, from: data) else { await pushPlanIfNeeded(); return }
        let local = PlanStore.load()
        if PlanStore.dirty, let l = local, (l.saved ?? 0) >= (remote.saved ?? 0) { await pushPlanIfNeeded(); return }
        if (remote.saved ?? 0) > (local?.saved ?? 0) || local == nil {
            PlanStore.defaults.set(try? JSONEncoder().encode(remote), forKey: "sr_plan_v2")
            PlanStore.dirty = false
            WidgetReload.now()
        }
    }

    func pushPlanIfNeeded() async {
        guard user != nil, PlanStore.dirty else { return }
        do {
            let json: AnyJSON
            if let p = PlanStore.load() { json = try JSONDecoder().decode(AnyJSON.self, from: JSONEncoder().encode(p)) }
            else { json = .null }
            _ = try await supabase.auth.update(user: UserAttributes(data: ["sr_plan": json]))
            PlanStore.dirty = false
        } catch { /* stays dirty, tries again next time */ }
    }
}

extension DateFormatter {
    static let supabase: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"; return f
    }()
}

import WidgetKit
enum WidgetReload { static func now() { WidgetCenter.shared.reloadAllTimelines() } }
