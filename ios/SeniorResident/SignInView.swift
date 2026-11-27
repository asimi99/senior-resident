import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @EnvironmentObject var account: Account
    @State private var creating = false
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agreed = false
    @State private var busy = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Image("Logo").resizable().scaledToFit().frame(width: 72, height: 72).clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.top, 40)
                Text("My Senior Resident").font(.largeTitle.weight(.bold))
                Text("Your study plan on your home screen, and a coach for the questions that trip you up.")
                    .multilineTextAlignment(.center).foregroundStyle(.secondary)

                SignInWithAppleButton(.continue, onRequest: account.appleRequest) { r in Task { await account.appleCompletion(r) } }
                    .signInWithAppleButtonStyle(.black).frame(height: 50).clipShape(RoundedRectangle(cornerRadius: 12))

                Button { Task { await account.signInWithGoogle() } } label: {
                    Label("Continue with Google", systemImage: "g.circle.fill").frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.bordered).clipShape(RoundedRectangle(cornerRadius: 12))

                HStack { Rectangle().frame(height: 1).opacity(0.15); Text("or").font(.footnote).foregroundStyle(.secondary); Rectangle().frame(height: 1).opacity(0.15) }

                VStack(spacing: 10) {
                    if creating { TextField("First and last name", text: $name).textContentType(.name).field() }
                    TextField("Email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never).field()
                    SecureField("Password", text: $password).textContentType(creating ? .newPassword : .password).field()
                    if creating {
                        Toggle(isOn: $agreed) {
                            Text("I am 18 or older and agree to the [Terms of Use](\(Config.terms.absoluteString)) and [Privacy Policy](\(Config.privacy.absoluteString)).")
                                .font(.footnote)
                        }.toggleStyle(CheckToggle())
                    }
                }

                if let e = account.error { Text(e).font(.footnote).foregroundStyle(.red) }

                Button {
                    busy = true
                    Task {
                        if creating { await account.signUp(name: name, email: email, password: password) }
                        else { await account.signIn(email: email, password: password) }
                        busy = false
                    }
                } label: {
                    Text(creating ? "Create account" : "Sign in").frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.borderedProminent).clipShape(RoundedRectangle(cornerRadius: 12))
                .disabled(busy || email.isEmpty || password.count < 6 || (creating && (!agreed || name.split(separator: " ").count < 2)))

                Button(creating ? "Already have an account? Sign in" : "New here? Create an account") { creating.toggle(); account.error = nil }
                    .font(.footnote)

                Text("Signing in with Apple or Google means you agree to the Terms of Use and Privacy Policy.")
                    .font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)

                if account.user == nil {
                    Button(account.guest ? "Not now" : "Continue without an account") { account.guest = true; account.showSignIn = false }
                        .font(.subheadline.weight(.semibold)).padding(.top, 4)
                    Text("Your plan, widget and reminders work on this phone without an account. Sign in later to use the coach and sync your plan with the website.")
                        .font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
            }
            .padding(24)
        }
    }
}

struct CheckToggle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square").font(.title3)
                configuration.label.multilineTextAlignment(.leading)
            }
        }.buttonStyle(.plain)
    }
}

extension View {
    func field() -> some View {
        padding(12).background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
