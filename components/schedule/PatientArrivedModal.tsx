'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  CheckCircle, 
  CreditCard, 
  Banknote,
  Download,
  Printer
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appointmentsApi } from '@/api/appointments.api';
import { paymentsApi } from '@/api/payments.api';
import type { Appointment, PaymentMethod } from '@/types';
import toast from 'react-hot-toast';

const paymentSchema = z.object({
  amount: z.number().min(0, 'Сумма должна быть положительной'),
  method: z.enum(['CASH', 'CARD', 'KASPI'] as const, {
    required_error: 'Выберите способ оплаты',
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PatientArrivedModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientArrivedModal({
  appointment,
  isOpen,
  onClose,
}: PatientArrivedModalProps) {
  const queryClient = useQueryClient();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: appointment ? appointment.service.price - appointment.prepayment : 0,
      method: 'CASH',
    },
  });

  // Отметить приход
  const arriveMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.markArrived(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  // Создать платёж
  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => {
      if (!appointment) throw new Error('No appointment');
      
      return paymentsApi.create({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        serviceId: appointment.serviceId,
        amount: data.amount,
        method: data.method,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentId(response.data?.id || null);
      setIsCompleted(true);
      toast.success('Оплата успешно проведена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Ошибка оплаты');
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!appointment) return;

    try {
      // 1. Отметить приход
      await arriveMutation.mutateAsync(appointment.id);
      
      // 2. Создать платёж
      await paymentMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error processing arrival:', error);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentId) return;

    try {
      const blob = await paymentsApi.getReceipt(paymentId);
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Чек загружен');
    } catch (error) {
      toast.error('Ошибка загрузки чека');
    }
  };

  const handlePrintReceipt = async () => {
    if (!paymentId) return;

    try {
      const blob = await paymentsApi.getReceipt(paymentId);
      const url = window.URL.createObjectURL(blob as Blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
      toast.success('Отправлено на печать');
    } catch (error) {
      toast.error('Ошибка печати чека');
    }
  };

  const handleClose = () => {
    reset();
    setPaymentId(null);
    setIsCompleted(false);
    onClose();
  };

  if (!appointment) return null;

  const remainingAmount = appointment.service.price - appointment.prepayment;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCompleted ? 'Оплата завершена' : 'Пациент прибыл'}
          </DialogTitle>
          <DialogDescription>
            {appointment.patient.fullName}
          </DialogDescription>
        </DialogHeader>

        {!isCompleted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Service Info */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Услуга:</span>
                <span className="font-medium">{appointment.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Стоимость:</span>
                <span className="font-medium">
                  {appointment.service.price.toLocaleString()} ₸
                </span>
              </div>
              {appointment.prepayment > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Предоплата:</span>
                  <span className="font-medium text-green-600">
                    -{appointment.prepayment.toLocaleString()} ₸
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium">К оплате:</span>
                <span className="text-lg font-bold text-blue-600">
                  {remainingAmount.toLocaleString()} ₸
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <Label>Сумма оплаты (₸)</Label>
              <Input
                type="number"
                {...register('amount', { valueAsNumber: true })}
                className="mt-2"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label>Способ оплаты</Label>
              <Select
                value={watch('method')}
                onValueChange={(value) => setValue('method', value as PaymentMethod)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Наличные
                    </div>
                  </SelectItem>
                  <SelectItem value="CARD">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Карта
                    </div>
                  </SelectItem>
                  <SelectItem value="KASPI">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Kaspi
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.method && (
                <p className="text-sm text-red-600 mt-1">{errors.method.message}</p>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={arriveMutation.isPending || paymentMutation.isPending}
              >
                {arriveMutation.isPending || paymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Подтвердить
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Оплата успешно проведена
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Чек готов к печати или скачиванию
              </p>
            </div>

            {/* Receipt Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadReceipt}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать чек
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintReceipt}
                className="flex-1"
              >
                <Printer className="w-4 h-4 mr-2" />
                Печать
              </Button>
            </div>

            {/* Close */}
            <Button onClick={handleClose} className="w-full">
              Закрыть
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
