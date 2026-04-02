import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUsePage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main className="mx-auto pt-20 md:pt-24 max-w-4xl px-4 md:px-6 pb-16">
                {/* Back Button */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black mb-8 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Terms of Use</h1>
                    <p className="text-gray-600">Last updated: February 18, 2026</p>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">1. Agreement to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By accessing and using CACHE ("the Platform"), you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use this service.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">2. Eligibility</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You must be at least 18 years old to use CACHE. By using this Platform, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these terms.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            CACHE does not allow users from jurisdictions where online betting or prediction markets are prohibited by law.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">3. User Accounts</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify CACHE immediately of any unauthorized use of your account.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            You must provide accurate, current, and complete information during registration. CACHE reserves the right to suspend or terminate accounts that contain false or incomplete information.
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">4. Prediction Markets and Betting</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            CACHE provides a platform for users to place bets on prediction markets. By placing a bet on any market:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                            <li>You acknowledge that you understand the risks involved in betting</li>
                            <li>You agree that your funds may be at risk and you could lose your entire investment</li>
                            <li>You accept that market outcomes are determined by the Platform's resolution process</li>
                            <li>You understand that no guarantee of profit or return on investment is provided</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">5. Payments and Deposits</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            All deposits are final and non-refundable except where required by law. CACHE is not responsible for:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                            <li>Fees charged by payment providers or your bank</li>
                            <li>Failed transactions or delays in payment processing</li>
                            <li>Currency conversion rates or foreign transaction fees</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-4">
                            Minimum and maximum deposit amounts may apply. CACHE reserves the right to suspend accounts for suspected fraudulent transactions.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">6. Withdrawals</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Withdrawal requests must be made through your CACHE account. Withdrawals are processed to the payment method used for your original deposit. CACHE may require additional verification before processing withdrawals.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            Withdrawal limits and processing times may apply and will be clearly displayed on the Platform. CACHE is not liable for delays caused by payment providers or your financial institution.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">7. Responsible Betting</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            CACHE promotes responsible betting. If you feel your betting is becoming problematic, we encourage you to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                            <li>Set deposit and bet limits</li>
                            <li>Take breaks from betting</li>
                            <li>Seek help from professional support organizations</li>
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">8. Prohibited Activities</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                            <li>Use automated systems or bots to access the Platform</li>
                            <li>Attempt to manipulate market outcomes or exploit Platform vulnerabilities</li>
                            <li>Share your account with other users</li>
                            <li>Use the Platform for illegal purposes or money laundering</li>
                            <li>Engage in fraudulent activities or misrepresentation</li>
                            <li>Harass, threaten, or abuse other users</li>
                        </ul>
                    </section>

                    {/* Section 9 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">9. Market Resolution</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Market outcomes are resolved by CACHE's Admin team based on publicly available information and predetermined resolution criteria. CACHE's resolution decision is final and binding. If you dispute a market resolution, you may contact support within 7 days of resolution with supporting evidence.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">10. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            CACHE is provided "as is" without warranties. To the maximum extent permitted by law, CACHE is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including loss of profits or funds.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">11. Termination</h2>
                        <p className="text-gray-700 leading-relaxed">
                            CACHE reserves the right to terminate or suspend your account at any time, with or without cause. Upon termination, any remaining balance will be refunded to your registered payment method within 30 days.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">12. Changes to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            CACHE may modify these Terms of Use at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. We will notify users of significant changes via email.
                        </p>
                    </section>

                    {/* Section 13 */}
                    <section>
                        <h2 className="text-2xl font-bold text-black mb-4">13. Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have questions about these Terms of Use, please contact us at:
                        </p>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            Email: support@CACHE.com <br />
                            Address: Nairobi, Kenya
                        </p>
                    </section>

                    {/* Warning Box */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-12">
                        <h3 className="text-lg font-bold text-yellow-800 mb-2">⚠️ Risk Warning</h3>
                        <p className="text-yellow-700">
                            Betting on prediction markets carries substantial risk of loss. Past performance does not indicate future results. Never bet more than you can afford to lose. Gambling can be addictive. If you suspect you have a gambling problem, seek help immediately.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
