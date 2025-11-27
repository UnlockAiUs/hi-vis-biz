import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HV</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Hi-Vis Biz</h1>
          </div>
          <div className="space-x-4">
            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              AI-Powered Employee Insights
            </div>
            <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
              Understand Your Team
              <span className="text-blue-600 block mt-2">In Just 2 Minutes a Day</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
              Build evolving employee profiles through micro AI conversations. 
              Track morale, map workflows, and surface pain points—all without lengthy surveys.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
              <Link
                href="#how-it-works"
                className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                See How It Works
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">No credit card required • Free 30-day trial</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white py-12 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">2 min</div>
                <div className="text-gray-600 mt-1">Average check-in time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">85%</div>
                <div className="text-gray-600 mt-1">Response rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">3x/week</div>
                <div className="text-gray-600 mt-1">Light-touch frequency</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">5</div>
                <div className="text-gray-600 mt-1">Specialized AI agents</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Five Perspectives, One Complete Picture
            </h3>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI agents work together to build comprehensive employee profiles
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                📊
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Pulse Check</h4>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Weekly morale and workload assessments. Catch burnout early and understand team sentiment trends.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">Morale</span>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">Workload</span>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">Burnout</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                👤
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Role Mapper</h4>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Understand what each person actually does day-to-day. Discover hidden responsibilities and expertise.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Responsibilities</span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Skills</span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Expertise</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                🔄
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Workflow Mapper</h4>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Map how work actually flows through your organization. Identify tools, processes, and bottlenecks.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Processes</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Tools</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Dependencies</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                🔍
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Pain Scanner</h4>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Surface friction points and blockers before they become major issues. Aggregate themes across teams.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">Blockers</span>
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">Friction</span>
                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">Suggestions</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Focus Tracker</h4>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Track what people are working on and their current priorities. Understand where time actually goes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Priorities</span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Projects</span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Goals</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-2xl shadow-lg text-white">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl mb-6">
                ✨
              </div>
              <h4 className="text-xl font-semibold">Unified Insights</h4>
              <p className="mt-3 text-blue-100 leading-relaxed">
                All five agents feed into evolving employee profiles, giving you a holistic view of your organization.
              </p>
              <Link 
                href="/auth/register"
                className="mt-6 inline-block bg-white text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Get Started →
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                How It Works
              </h3>
              <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                Get started in minutes, see results in days
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                  1
                </div>
                <h4 className="mt-6 text-xl font-semibold text-gray-900">Set Up Your Org</h4>
                <p className="mt-3 text-gray-600">
                  Create your organization, add departments, and invite team members via email.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                  2
                </div>
                <h4 className="mt-6 text-xl font-semibold text-gray-900">Daily Check-ins</h4>
                <p className="mt-3 text-gray-600">
                  Employees spend 1-2 minutes chatting with AI agents 2-3 times per week.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                  3
                </div>
                <h4 className="mt-6 text-xl font-semibold text-gray-900">Get Insights</h4>
                <p className="mt-3 text-gray-600">
                  View department analytics, morale trends, and actionable insights in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Built for Growing Teams
            </h3>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Whether you're 10 people or 1,000, Hi-Vis helps you stay connected
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-2xl mr-3">🏢</span>
                HR Leaders
              </h4>
              <p className="mt-3 text-gray-600">
                Replace annual surveys with continuous feedback. Spot retention risks early and understand what employees really need.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-2xl mr-3">👥</span>
                Team Managers
              </h4>
              <p className="mt-3 text-gray-600">
                Know how your team is really doing without awkward 1:1s. Understand workloads and blockers in real-time.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-2xl mr-3">⚡</span>
                Operations
              </h4>
              <p className="mt-3 text-gray-600">
                Map actual workflows and identify process bottlenecks. Discover which tools work and which ones don't.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-2xl mr-3">📈</span>
                Executives
              </h4>
              <p className="mt-3 text-gray-600">
                Get a pulse on organizational health without filtering through layers. Make data-driven people decisions.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to See Your Team Clearly?
            </h3>
            <p className="mt-4 text-xl text-blue-100">
              Start your free trial today. No credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/register"
                className="bg-white text-blue-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition-colors shadow-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/auth/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">HV</span>
                </div>
                <span className="text-white font-bold">Hi-Vis Biz</span>
              </div>
              <p className="text-sm">
                AI-powered employee insights for modern teams.
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 Hi-Vis Biz. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
