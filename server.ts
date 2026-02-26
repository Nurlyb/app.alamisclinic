/**
 * Custom Server для Next.js + Socket.io
 * Запускает HTTP сервер с поддержкой WebSocket
 */

import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './lib/socket/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Инициализация Socket.io
  initSocketServer(httpServer);

  httpServer
    .once('error', (err) => {
      console.error('❌ Ошибка сервера:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏥 Clinic Management System                             ║
║                                                            ║
║   ✅ Next.js сервер:    http://${hostname}:${port}        ║
║   ✅ Socket.io сервер:  ws://${hostname}:${port}          ║
║   ✅ Режим:             ${dev ? 'development' : 'production'}                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Получен сигнал завершения, закрываем сервер...');

    httpServer.close(() => {
      console.log('✅ HTTP сервер закрыт');
      process.exit(0);
    });

    // Таймаут для принудительного завершения
    setTimeout(() => {
      console.error('⚠️  Принудительное завершение');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
