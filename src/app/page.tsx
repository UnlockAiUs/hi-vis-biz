/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/page.tsx
 * PURPOSE: Public landing page / marketing homepage
 * 
 * SECTIONS:
 * - Header with nav (Sign in / Get Started)
 * - Hero section with CTA
 * - Stats section (2 min, 85% response, 3x/week, 5 agents)
 * - Features section (5 AI agents + unified insights)
 * - How It Works (3 steps)
 * - Use Cases (HR, Managers, Ops, Execs)
 * - CTA section
 * - Footer
 * 
 * NOT PROTECTED - public access
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VD</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">VizDots</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md text-sm sm:text-base min-h-[44px] flex items-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Simple. Human. Insightful.
            </div>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
              See Your Business Clearly
              <span className="text-blue-600 block mt-2">One Dot at a Time</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed px-4">
              VizDots turns small daily check-ins into a living map of how your business actually runs.
              Uncover hidden steps. Spot friction points. Strengthen your team.
              <span className="block mt-2 font-medium">Get clarity without complexity.</span>
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-4 px-4">
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-6 sm:px-8 py-4 rounded-lg text-base sm:text-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-h-[48px] flex items-center justify-center"
              >
                Start Free → 30 Days On Us
              </Link>
              <Link
                href="#how-it-works"
                className="border-2 border-gray-200 text-gray-700 px-6 sm:px-8 py-4 rounded-lg text-base sm:text-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all min-h-[48px] flex items-center justify-center"
              >
                See How It Works
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 px-4">No credit card required • No setup • No dashboards to build</p>
          </div>
        </section>

        {/* What VizDots Does Section */}
        <section className="bg-white py-16 sm:py-20 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Small Inputs. Big Visibility. Real Improvement.
              </h3>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                Your people know the truth about how work gets done.
                VizDots makes it easy for them to share it — naturally, in tiny moments.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📍</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Each check-in is a dot</h4>
                <p className="mt-2 text-gray-600">A small clue about workflows, roadblocks, responsibilities, and experience.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔗</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">VizDots connects the dots</h4>
                <p className="mt-2 text-gray-600">Into a clear, living picture of your operations.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✨</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Clarity delivered automatically</h4>
                <p className="mt-2 text-gray-600">No setup. No dashboards to build. No training required.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why This Matters Section */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                Why This Matters
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                Because most small businesses run on undocumented knowledge.
              </p>
              <div className="grid sm:grid-cols-2 gap-6 text-left">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="text-2xl mb-3">🧠</div>
                  <p className="text-gray-700">Processes live in people&apos;s heads.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="text-2xl mb-3">🔄</div>
                  <p className="text-gray-700">Roles evolve without being captured.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="text-2xl mb-3">👁️</div>
                  <p className="text-gray-700">Owners see the outcomes — not the steps it took to get there.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="text-2xl mb-3">🚧</div>
                  <p className="text-gray-700">Employees work around problems that never get surfaced.</p>
                </div>
              </div>
              <p className="mt-8 text-lg font-medium text-blue-600">
                VizDots reveals the real story, one dot at a time.
              </p>
            </div>
          </div>
        </section>

        {/* Who VizDots Is For Section */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Who VizDots Is For
              </h3>
              <p className="mt-4 text-lg text-gray-600">
                Built for the businesses where clarity matters most
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">🔧</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Service & Field Ops</p>
              </div>
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">🚚</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Logistics & Dispatch</p>
              </div>
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">🏗️</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Trades & Labor</p>
              </div>
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">🏪</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Retail & Distributed Teams</p>
              </div>
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">🏨</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Hospitality & Support</p>
              </div>
              <div className="bg-blue-50 p-4 sm:p-6 rounded-xl text-center">
                <span className="text-2xl sm:text-3xl">📈</span>
                <p className="mt-2 font-medium text-gray-900 text-sm sm:text-base">Growing SMBs</p>
              </div>
            </div>
            <p className="mt-8 text-center text-gray-600 text-lg">
              If your business depends on people doing real work every day…<br />
              <span className="font-medium text-gray-900">VizDots helps you see it.</span>
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* How It Works Section - 5 Steps */}
        <section id="how-it-works" className="bg-gray-50 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 sm:text-4xl">
                How VizDots Works
              </h3>
              <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                Get started in minutes, see results in days
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto">
                  1
                </div>
                <h4 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">Create Your Organization</h4>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Enter your company name and invite your team with a simple CSV upload.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto">
                  2
                </div>
                <h4 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">Quick Daily Check-Ins</h4>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Short. Lightweight. Personalized to each role.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto">
                  3
                </div>
                <h4 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">Each Response = A Dot</h4>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Every dot reflects a small truth about how work happens.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto">
                  4
                </div>
                <h4 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">VizDots Connects</h4>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  Workflows revealed. Friction surfaced. Documentation auto-generated.
                </p>
              </div>
              <div className="text-center sm:col-span-2 lg:col-span-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto">
                  5
                </div>
                <h4 className="mt-4 sm:mt-6 text-lg sm:text-xl font-semibold text-gray-900">Continuous Clarity</h4>
                <p className="mt-2 sm:mt-3 text-gray-600 text-sm sm:text-base">
                  No configuration. No complexity. Just a clear, evolving view of your business.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                What You Get From VizDots
              </h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">🔍</div>
                <h4 className="text-lg font-semibold text-gray-900">Operational Clarity</h4>
                <p className="mt-2 text-gray-600">See how work actually gets done — not how you assume it works.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">🗺️</div>
                <h4 className="text-lg font-semibold text-gray-900">Live Workflow Maps</h4>
                <p className="mt-2 text-gray-600">Dots build patterns; patterns become insight.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">📝</div>
                <h4 className="text-lg font-semibold text-gray-900">Documentation Without Pain</h4>
                <p className="mt-2 text-gray-600">Process documentation created from real check-ins.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">⚠️</div>
                <h4 className="text-lg font-semibold text-gray-900">Early Warning Signals</h4>
                <p className="mt-2 text-gray-600">Catch bottlenecks before they turn into problems.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">👥</div>
                <h4 className="text-lg font-semibold text-gray-900">Performance & Role Visibility</h4>
                <p className="mt-2 text-gray-600">See responsibilities, steps, and blockers per role.</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                <div className="text-3xl mb-4">🎯</div>
                <h4 className="text-lg font-semibold text-gray-900">Small Wins, Big Results</h4>
                <p className="mt-2 text-gray-600">Tiny daily signals that compound into a smarter business.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why VizDots Wins Section */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Why VizDots Wins
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🏪</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Made for Small Businesses</h4>
                <p className="mt-3 text-gray-600">Simple setup. Natural adoption. Value from day one.</p>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎓</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Zero Training Required</h4>
                <p className="mt-3 text-gray-600">Your team interacts with VizDots like a person, not a platform.</p>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚡</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">No Setup. No Overhead.</h4>
                <p className="mt-3 text-gray-600">Enter your people, and VizDots does the rest.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white sm:text-4xl">
              Ready to See Your Business Clearly?
            </h3>
            <p className="mt-4 text-lg sm:text-xl text-blue-100">
              Start your free trial today. No credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 px-4">
              <Link
                href="/auth/register"
                className="bg-white text-blue-700 px-6 sm:px-8 py-4 rounded-lg text-base sm:text-lg font-medium hover:bg-blue-50 transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
              >
                Start Free → 30 Days On Us
              </Link>
              <Link
                href="/auth/login"
                className="border-2 border-white text-white px-6 sm:px-8 py-4 rounded-lg text-base sm:text-lg font-medium hover:bg-white/10 transition-colors min-h-[48px] flex items-center justify-center"
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
                  <span className="text-white font-bold text-sm">VD</span>
                </div>
                <span className="text-white font-bold">VizDots</span>
              </div>
              <p className="text-sm">
                Small inputs. Big visibility. Real improvement.
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
            <p>&copy; 2025 VizDots. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
