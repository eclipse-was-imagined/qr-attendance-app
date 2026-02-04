export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">
          QR Attendance System
        </h1>

        <p className="text-lg text-slate-300">
          Secure attendance using QR, location & face verification
        </p>

        <div className="flex gap-4 justify-center">
          <a
            href="/teacher"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Teacher Login
          </a>

          <a
            href="/student"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Student Login
          </a>
        </div>
      </div>
    </main>
  );
}
