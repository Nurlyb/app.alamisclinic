/**
 * AWS S3 / Supabase Storage для хранения файлов
 * Загрузка PDF чеков, анализов, снимков
 */

import AWS from 'aws-sdk';
import { randomUUID } from 'crypto';

// Конфигурация AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'clinic-files';

/**
 * Загрузка файла в S3
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'receipts'
): Promise<string> {
  try {
    const key = `${folder}/${Date.now()}-${randomUUID()}-${fileName}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    };

    await s3.upload(params).promise();

    // Возвращаем URL файла
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Загрузка PDF чека
 */
export async function uploadReceiptPDF(
  pdfBuffer: Buffer,
  directionNumber: number
): Promise<string> {
  const fileName = `receipt-${directionNumber}.pdf`;
  return uploadFile(pdfBuffer, fileName, 'application/pdf', 'receipts');
}

/**
 * Загрузка файла пациента (анализ, снимок)
 */
export async function uploadPatientFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  patientId: string
): Promise<string> {
  return uploadFile(buffer, fileName, contentType, `patients/${patientId}`);
}

/**
 * Получение подписанного URL для скачивания
 */
export async function getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Извлекаем ключ из URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Убираем первый слеш

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Удаление файла из S3
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1);

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Проверка существования файла
 */
export async function fileExists(fileUrl: string): Promise<boolean> {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1);

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    return false;
  }
}
