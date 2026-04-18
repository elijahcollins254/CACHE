'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LiquidityTermsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-24 pb-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <Link href="/liquidity" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-8">
            <ArrowLeft size={18} />
            Back to Liquidity
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Liquidity Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
            Important information about providing liquidity on CACHE markets
          </p>

          {/* Last Updated */}
          <div className="mb-12 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-2xl">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Last Updated:</strong> April 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overview</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By providing liquidity to CACHE prediction markets, you become a Liquidity Provider (LP). This means you deposit capital into a market's liquidity pool and earn fees from trading activity in exchange for assuming market risks.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                This document outlines the risks, fees, and mechanics of liquidity provision on CACHE. Please read carefully before depositing.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How Liquidity Provision Works</h2>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Deposit</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    You deposit KES into a market. Your capital is split equally into YES and NO shares at the current market price, matching the Automated Market Maker (AMM) model.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Fee Collection</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    Every trade generates a 0.5% fee. These fees are collected and distributed equally among all liquidity providers based on their pool share.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Claim or Withdraw</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    You can claim accumulated fees without withdrawing capital. To exit, you withdraw your remaining capital and any claimed fees.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Fee Structure</h2>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-600 pl-4">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Trading Fee: 0.5%</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    Collected on every trade and distributed to all LP holders proportionally.
                  </p>
                </div>
                <div className="border-l-4 border-green-600 pl-4">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Withdrawal Fee: 0.1%</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    Applied to the amount you withdraw (principal + fees claimed).
                  </p>
                </div>
                <div className="border-l-4 border-red-600 pl-4">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Early Withdrawal Penalty: 2%</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    If you withdraw within 7 days of deposit, an additional 2% penalty applies.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Impermanent Loss (IL)</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Impermanent Loss</strong> occurs when market odds shift after you deposit. Your position's value diverges from simply holding the capital, resulting in a loss compared to the "hold" scenario.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-6 mb-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Example:</h4>
                <ul className="text-sm text-yellow-900 dark:text-yellow-400 space-y-2">
                  <li>• You deposit 10,000 KES at 50/50 odds (5,000 YES, 5,000 NO)</li>
                  <li>• Odds shift dramatically to 80/20 (YES favored 4:1)</li>
                  <li>• Your position is now worth ~7,500 KES instead of 10,000 KES</li>
                  <li>• You have incurred ~2,500 KES in IL</li>
                  <li>• This is offset by fees earned from trading on your shares</li>
                </ul>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Important:</strong> Fee income offsets some or all IL, but is not guaranteed. High-volatility markets carry greater IL risk.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Risk Acknowledgment</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By providing liquidity, you acknowledge and accept the following risks:
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="text-red-600 dark:text-red-400 font-bold">●</span>
                  <span><strong>Impermanent Loss:</strong> Your position value may decrease due to price movements.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-600 dark:text-red-400 font-bold">●</span>
                  <span><strong>Market Risk:</strong> If a market resolves unfavorably (e.g., technical issues), your shares may be worth less.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-600 dark:text-red-400 font-bold">●</span>
                  <span><strong>Liquidity Risk:</strong> You may not always be able to withdraw immediately if the pool is constrained.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-600 dark:text-red-400 font-bold">●</span>
                  <span><strong>Smart Contract Risk:</strong> Technical bugs or exploits could affect your capital (unlikely with audited contracts).</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-600 dark:text-red-400 font-bold">●</span>
                  <span><strong>Fee Variability:</strong> Fee income is not guaranteed and depends on trading volume.</span>
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Lockup Period</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>7-Day Lockup:</strong> To prevent high-frequency liquidity abuse, withdrawals within 7 days of deposit incur a 2% penalty.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                After 7 days, you can withdraw without penalty (though the 0.1% withdrawal fee still applies).
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Tax and Legal Considerations</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>You are responsible for all tax obligations</strong> related to your liquidity provision activities, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Capital gains/losses from appreciation/depreciation</li>
                <li>Income tax on fees earned</li>
                <li>Local tax reporting requirements</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                CACHE does not provide tax advice. Consult a tax professional for guidance.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Dispute Resolution</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you believe there is an issue with your liquidity position:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Review your transaction history and pool statistics</li>
                <li>Contact CACHE Support with evidence</li>
                <li>CACHE will investigate and respond within 5 business days</li>
                <li>If unresolved, disputes may be elevated for further review</li>
              </ol>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Changes to Terms</h2>
              <p className="text-gray-700 dark:text-gray-300">
                CACHE reserves the right to modify liquidity terms, fee structures, and mechanics. We will notify users of significant changes at least 7 days in advance. Continued use of the liquidity feature constitutes acceptance of updated terms.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Agreement</h2>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  By clicking "Deposit" and providing liquidity, you confirm that you have read, understood, and agree to these terms and conditions. You acknowledge the risks and accept full responsibility for your decisions.
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Questions? Contact <a href="mailto:support@cache.example.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@cache.example.com</a>
              </p>
              <Link href="/liquidity" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                Back to Liquidity
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
