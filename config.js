/* Senior Resident settings. Everything here is safe to publish. */
window.SR_CONFIG = {
  SUPABASE_URL: 'https://ldvuigiqzloupwpfucfh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdnVpZ2lxemxvdXB3cGZ1Y2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NzAzMDIsImV4cCI6MjExMDQ0NjMwMn0.JRB5LnBEPUc8Z358HwRkua81dM9Yc8-7slXA29zXbzo',
  GOOGLE_CLIENT_ID: '62251828530-6cshlc720afjq3k75ek0fsep1pv9krma.apps.googleusercontent.com',
  SITE: 'https://asimi99.github.io/senior-resident/',

  /* Billing. While BILLING_LIVE is false everyone has full access and Upgrade collects a waitlist.
     To start charging: deploy supabase/functions, run supabase/senior-resident.sql, paste the
     Stripe Payment Link below, then set BILLING_LIVE to true. */
  BILLING_LIVE: false,
  FREE_DAILY: 5,
  PRO_DAILY: 40,
  CURRENCY: 'CAD',
  PRICE_MONTH: 15,
  PRICE_FELLOW: 25,
  TRIAL_DAYS: 7,        // one free trial of the Resident plan, one per card (card needed at Stripe checkout)
  TRIAL_EXAM_QS: 10,    // during a trial, only this many questions of a PDF become an exam
  STRIPE_LINK: '',        // Resident plan Payment Link (7-day trial, promo codes allowed)
  STRIPE_LINK_CHIEF: '',  // Chief plan Payment Link (promo codes allowed)
  STRIPE_PORTAL: ''
};
