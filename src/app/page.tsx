import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23]">
      <div className="text-center max-w-[400px] w-full mx-auto">
        <div className="flex justify-center mb-4">
          <img
            src="/callister-logo.png"
            alt="Callister"
            className="w-28 h-28 object-contain"
          />
        </div>
        <p className="hero-tagline mb-2">Gelişmiş scouting ile güçlendirildi</p>
        <h1 className="hero-title text-[#f0f0f5] mb-1">Callister 9024</h1>
        <p className="text-[#f0f0f5]/70 text-base mb-2">Dijital scouting uygulaması</p>
        <p className="text-[#f0f0f5]/80 text-sm mb-8">
          FRC için dijital scouting uygulaması. Yarışmalarda takımınızı zirveye taşıyacak verileri toplayın.
        </p>
        <Link
          href="/login"
          className="block w-full py-4 px-6 text-base font-semibold rounded-xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white hover:from-[#4f46e5] hover:to-[#4338ca] text-center shadow-lg shadow-indigo-500/30 transition-all"
        >
          Giriş yap
        </Link>
        <p className="mt-6 text-sm text-[#f0f0f5]/60">Yarışmaya hazır.</p>
      </div>
    </div>
  );
}
