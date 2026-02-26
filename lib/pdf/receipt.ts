/**
 * Генерация PDF чеков с штрихкодом и QR-кодом
 * Поддержка термопринтеров 58мм и 80мм
 */

import puppeteer from 'puppeteer';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { createCanvas } from 'canvas';

export interface ReceiptData {
  directionNumber: number;
  status: 'ОПЛАЧЕНО' | 'ВОЗВРАТ';
  registrar: string;
  datetime: Date;
  patient: {
    fullName: string;
    iin: string;
  };
  department: string;
  doctor: string;
  referredFrom?: {
    department: string;
    doctor: string;
  };
  services: Array<{
    code: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  payment: {
    total: number;
    cash: number;
    cashless: number;
    change: number;
  };
  refund?: {
    originalNumber: number;
    reason: string;
    amount: number;
    method: string;
    approvedBy: string;
  };
  receiptUrl: string;
}

/**
 * Генерация штрихкода Code128
 */
async function generateBarcode(value: string): Promise<string> {
  const canvas = createCanvas(300, 100);
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 2,
    height: 80,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL();
}

/**
 * Генерация QR-кода
 */
async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Форматирование номера направления
 */
function formatDirectionNumber(num: number): string {
  return `№${String(num).padStart(5, '0')}`;
}

/**
 * Форматирование даты и времени
 */
function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Генерация HTML для чека
 */
function generateReceiptHTML(data: ReceiptData, width: 58 | 80): string {
  const barcodeValue = String(data.directionNumber).padStart(5, '0');
  const qrUrl = data.receiptUrl;

  const isRefund = data.status === 'ВОЗВРАТ';
  const statusColor = isRefund ? '#EF4444' : '#10B981';

  // Ширина контента в пикселях
  const contentWidth = width === 58 ? '220px' : '300px';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: ${width === 58 ? '10px' : '12px'};
      line-height: 1.4;
      width: ${contentWidth};
      padding: 10px;
      background: white;
    }
    
    .receipt {
      width: 100%;
    }
    
    .status {
      text-align: center;
      font-weight: bold;
      font-size: ${width === 58 ? '12px' : '14px'};
      color: ${statusColor};
      margin-bottom: 8px;
      padding: 4px;
      border: 2px solid ${statusColor};
    }
    
    .registrar {
      text-align: center;
      margin-bottom: 8px;
      font-size: ${width === 58 ? '9px' : '11px'};
    }
    
    .barcode {
      text-align: center;
      margin: 10px 0;
    }
    
    .barcode img {
      width: 100%;
      max-width: ${width === 58 ? '180px' : '250px'};
      height: auto;
    }
    
    .direction-number {
      text-align: center;
      font-weight: bold;
      font-size: ${width === 58 ? '11px' : '13px'};
      margin-bottom: 8px;
    }
    
    .section {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #000;
    }
    
    .section:last-of-type {
      border-bottom: none;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    
    .label {
      font-weight: bold;
    }
    
    .value {
      text-align: right;
    }
    
    .services-table {
      width: 100%;
      margin: 8px 0;
      border-collapse: collapse;
    }
    
    .services-table th {
      text-align: left;
      padding: 3px 2px;
      border-bottom: 1px solid #000;
      font-weight: bold;
      font-size: ${width === 58 ? '9px' : '10px'};
    }
    
    .services-table td {
      padding: 3px 2px;
      font-size: ${width === 58 ? '9px' : '10px'};
    }
    
    .services-table .num {
      width: 15px;
    }
    
    .services-table .code {
      width: ${width === 58 ? '30px' : '40px'};
    }
    
    .services-table .qty {
      width: 20px;
      text-align: center;
    }
    
    .services-table .price {
      text-align: right;
      width: ${width === 58 ? '50px' : '60px'};
    }
    
    .total {
      font-weight: bold;
      font-size: ${width === 58 ? '11px' : '13px'};
      margin-top: 8px;
    }
    
    .qr-code {
      text-align: center;
      margin-top: 10px;
    }
    
    .qr-code img {
      width: ${width === 58 ? '100px' : '120px'};
      height: ${width === 58 ? '100px' : '120px'};
    }
    
    .refund-info {
      background: #FEE2E2;
      padding: 8px;
      margin: 10px 0;
      border: 1px solid #EF4444;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Статус -->
    <div class="status">${data.status}</div>
    
    <!-- Регистратор -->
    <div class="registrar">Регистратор: ${data.registrar}</div>
    
    <!-- Штрихкод -->
    <div class="barcode">
      <img src="BARCODE_PLACEHOLDER" alt="Barcode" />
    </div>
    
    <!-- Номер направления -->
    <div class="direction-number">
      Направление ${formatDirectionNumber(data.directionNumber)}
    </div>
    
    <!-- Дата и время -->
    <div class="section">
      <div class="row">
        <span class="label">Дата:</span>
        <span class="value">${formatDateTime(data.datetime)}</span>
      </div>
    </div>
    
    <!-- Информация о пациенте -->
    <div class="section">
      <div class="row">
        <span class="label">Пациент:</span>
      </div>
      <div style="margin-left: 10px;">
        <div>${data.patient.fullName}</div>
        <div>ИИН: ${data.patient.iin}</div>
      </div>
    </div>
    
    <!-- Отделение и врач -->
    <div class="section">
      <div class="row">
        <span class="label">Отделение:</span>
        <span class="value">${data.department}</span>
      </div>
      <div class="row">
        <span class="label">Врач:</span>
        <span class="value">${data.doctor}</span>
      </div>
      ${
        data.referredFrom
          ? `
      <div class="row">
        <span class="label">Направлен (отд):</span>
        <span class="value">${data.referredFrom.department}</span>
      </div>
      <div class="row">
        <span class="label">Кем направлен:</span>
        <span class="value">${data.referredFrom.doctor}</span>
      </div>
      `
          : ''
      }
    </div>
    
    ${
      isRefund && data.refund
        ? `
    <!-- Информация о возврате -->
    <div class="refund-info">
      <div class="row">
        <span class="label">Оригинальное направление:</span>
        <span class="value">${formatDirectionNumber(data.refund.originalNumber)}</span>
      </div>
      <div class="row">
        <span class="label">Причина:</span>
      </div>
      <div style="margin-left: 10px; margin-top: 3px;">
        ${data.refund.reason}
      </div>
      <div class="row" style="margin-top: 5px;">
        <span class="label">Одобрил:</span>
        <span class="value">${data.refund.approvedBy}</span>
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Список услуг -->
    <div class="section">
      <div style="font-weight: bold; margin-bottom: 5px;">Список услуг:</div>
      <table class="services-table">
        <thead>
          <tr>
            <th class="num">#</th>
            <th class="code">Код</th>
            <th>Наименование</th>
            <th class="qty">Кол</th>
            <th class="price">Цена</th>
          </tr>
        </thead>
        <tbody>
          ${data.services
            .map(
              (service, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td class="code">${service.code}</td>
            <td>${service.name}</td>
            <td class="qty">${service.quantity}</td>
            <td class="price">${service.price.toLocaleString('ru-KZ')} ₸</td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Итого -->
    <div class="section">
      <div class="row total">
        <span>Сумма:</span>
        <span>${data.payment.total.toLocaleString('ru-KZ')} ₸</span>
      </div>
      ${
        !isRefund
          ? `
      <div class="row">
        <span>Наличные:</span>
        <span>${data.payment.cash.toLocaleString('ru-KZ')} ₸</span>
      </div>
      <div class="row">
        <span>Безналичные:</span>
        <span>${data.payment.cashless.toLocaleString('ru-KZ')} ₸</span>
      </div>
      ${
        data.payment.change > 0
          ? `
      <div class="row">
        <span>Сдача:</span>
        <span>${data.payment.change.toLocaleString('ru-KZ')} ₸</span>
      </div>
      `
          : ''
      }
      `
          : `
      <div class="row">
        <span>Возвращено:</span>
        <span>${data.refund!.amount.toLocaleString('ru-KZ')} ₸</span>
      </div>
      <div class="row">
        <span>Способ:</span>
        <span>${data.refund!.method}</span>
      </div>
      `
      }
    </div>
    
    <!-- QR-код -->
    <div class="qr-code">
      <img src="QR_PLACEHOLDER" alt="QR Code" />
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Генерация PDF чека
 */
export async function generateReceiptPDF(
  data: ReceiptData,
  width: 58 | 80 = 80
): Promise<Buffer> {
  let browser;

  try {
    // Генерация штрихкода и QR-кода
    const barcodeValue = String(data.directionNumber).padStart(5, '0');
    const barcodeDataUrl = await generateBarcode(barcodeValue);
    const qrDataUrl = await generateQRCode(data.receiptUrl);

    // Генерация HTML
    let html = generateReceiptHTML(data, width);
    html = html.replace('BARCODE_PLACEHOLDER', barcodeDataUrl);
    html = html.replace('QR_PLACEHOLDER', qrDataUrl);

    // Запуск Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Установка HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Ширина страницы в мм
    const pageWidth = width === 58 ? 58 : 80;

    // Генерация PDF
    const pdfBuffer = await page.pdf({
      width: `${pageWidth}mm`,
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw new Error('Failed to generate receipt PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Генерация чека возврата
 */
export async function generateRefundReceiptPDF(
  originalReceipt: ReceiptData,
  refundData: {
    reason: string;
    amount: number;
    method: string;
    approvedBy: string;
  },
  width: 58 | 80 = 80
): Promise<Buffer> {
  const refundReceipt: ReceiptData = {
    ...originalReceipt,
    status: 'ВОЗВРАТ',
    refund: {
      originalNumber: originalReceipt.directionNumber,
      reason: refundData.reason,
      amount: refundData.amount,
      method: refundData.method,
      approvedBy: refundData.approvedBy,
    },
  };

  return generateReceiptPDF(refundReceipt, width);
}
