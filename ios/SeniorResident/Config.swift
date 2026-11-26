import Foundation

enum Config {
    static let supabaseURL = URL(string: "https://ldvuigiqzloupwpfucfh.supabase.co")!
    static let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdnVpZ2lxemxvdXB3cGZ1Y2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NzAzMDIsImV4cCI6MjExMDQ0NjMwMn0.JRB5LnBEPUc8Z358HwRkua81dM9Yc8-7slXA29zXbzo"   // public anon key, same as config.js
    /// Matches BILLING_LIVE on the website. While false, every signed-in account gets everything.
    static let billingLive = false
    static let site = URL(string: "https://myseniorresident.com")!
    static let privacy = URL(string: "https://myseniorresident.com/privacy.html")!
    static let terms = URL(string: "https://myseniorresident.com/terms.html")!
    static let redirect = URL(string: "seniorresident://login-callback")!
}
