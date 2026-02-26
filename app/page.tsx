export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🏥 Clinic Management System</h1>
        <p className="text-xl text-gray-600 mb-8">
          Production-ready веб-приложение для управления многопрофильной клиникой
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти в систему
          </a>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Дашборд
          </a>
        </div>
      </div>
    </main>
  );
}
