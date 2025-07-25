import { Link } from "wouter";

export default function TVDisplay() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">TV Display Removed</h1>
        <p className="text-gray-300 mb-6">The TV broadcast functionality has been completely removed.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
          Return to Poker Calculator
        </Link>
      </div>
    </div>
  );
}