'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/api/client';
import toast from 'react-hot-toast';

const paymentSchema = z.object({
  method: z.enum(['CASH', 'KASPI', 'CARD', 'MIXED']),
  cash: z.number().min(0).optional(),
  cashless: z.number().min(0).optional(),
  change: z.number().min(0).optional(),
  cashAmount: z.number().min(0).optional(),
  cardAmount: z.number().min(0).optional(),
  cardType: z.enum(['KASPI', 'CARD']).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Operation {
  id: string;
  patientId: string;
  price: number;
  notes: string | null;
  status: string;
  scheduledDate: string | null;
  date: string | null;
  time: string | null;
  patient: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
}

interface OperationPaymentModalProps {
  operation: Operation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OperationPaymentModal({ operation, isOpen, onClose }: OperationPaymentModalProps) {
  const queryClient = useQueryClient();
  const [cashInput, setCashInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: 'CASH',
      cash: 0,
      cashless: 0,
      change: 0,
      cashAmount: 0,
      cardAmount: 0,
      cardType: 'KASPI',
    },
  });

  const method = watch('method');
  const amount = operation?.price || 0; // Используем цену из операции
  const cashAmount = watch('cashAmount') || 0;
  const cardAmount = watch('cardAmount') || 0;

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!operation) throw new Error('Операция не выбрана');
      
      let cash = 0;
      let cashless = 0;

      if (data.method === 'CASH') {
        cash = operation.price;
      } else if (data.method === 'KASPI' || data.method === 'CARD') {
        cashless = operation.price;
      } else if (data.method === 'MIXED') {
        cash = data.cashAmount || 0;
        cashless = data.cardAmount || 0;
      }
      
      return api.post(`/api/doctor-service-assignments/${operation.id}/payment`, {
        amount: operation.price, // Используем цену из операции
        method: data.method,
        cash,
        cashless,
        change: data.change || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-receptionist'] });
      queryClient.invalidateQueries({ queryKey: ['operations-calendar'] });
      toast.success('Оплата услуги принята');
      reset();
      setCashInput('');
      onClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при оплате';
      toast.error(message);
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate(data);
  };

  const handleCashInputChange = (value: string) => {
    setCashInput(value);
    const cashAmount = parseFloat(value) || 0;
    setValue('cash', cashAmount);
    
    if (cashAmount >= amount) {
      setValue('change', cashAmount - amount);
    } else {
      setValue('change', 0);
    }
  };

  const handleMethodChange = (newMethod: 'CASH' | 'KASPI' | 'CARD' | 'MIXED') => {
    setValue('method', newMethod);
    
    if (newMethod === 'CASH') {
      setValue('cash', 0);
      setValue('cashless', 0);
      setValue('change', 0);
      setValue('cashAmount', 0);
      setValue('cardAmount', 0);
      setCashInput('');
    } else if (newMethod === 'MIXED') {
      setValue('cash', 0);
      setValue('cashless', 0);
      setValue('change', 0);
      setValue('cashAmount', 0);
      setValue('cardAmount', 0);
      setCashInput('');
    } else {
      setValue('cash', 0);
      setValue('cashless', amount);
      setValue('change', 0);
      setValue('cashAmount', 0);
      setValue('cardAmount', 0);
      setCashInput('');
    }
  };

  if (!operation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Пациент прибыл</DialogTitle>
          <DialogDescription>
            {operation.patient.fullName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Информация об услуге */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Услуга:</span>
              <span className="font-medium">{operation.service.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Пациент:</span>
              <span className="font-medium">{operation.patient.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Телефон:</span>
              <span className="font-medium">{operation.patient.phone}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-blue-300">
              <span className="font-medium">К оплате:</span>
              <span className="text-lg font-bold text-blue-600">
                {operation.price.toLocaleString()} ₸
              </span>
            </div>
          </div>

          {/* Сумма оплаты */}
          <div>
            <Label className="text-sm">Сумма оплаты (₸)</Label>
            <Input
              type="number"
              value={operation.price}
              className="mt-1.5 bg-gray-100"
              readOnly
              disabled
            />
          </div>

          {/* Способ оплаты */}
          <div>
            <Label className="text-sm">Способ оплаты</Label>
            <Select
              value={method}
              onValueChange={handleMethodChange}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Наличные
                  </div>
                </SelectItem>
                <SelectItem value="KASPI">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Kaspi Pay
                  </div>
                </SelectItem>
                <SelectItem value="CARD">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Halyk Bank
                  </div>
                </SelectItem>
                <SelectItem value="MIXED">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <Banknote className="w-4 h-4" />
                    Разным способом
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Поле для наличных */}
          {method === 'CASH' && (
            <div>
              <Label className="text-sm">Получено наличными</Label>
              <Input
                type="number"
                value={cashInput}
                onChange={(e) => handleCashInputChange(e.target.value)}
                placeholder="Введите сумму"
                className="mt-1.5"
              />
              {parseFloat(cashInput) > 0 && parseFloat(cashInput) >= amount && (
                <p className="text-sm text-green-600 mt-1">
                  Сдача: {(parseFloat(cashInput) - amount).toLocaleString()} ₸
                </p>
              )}
              {parseFloat(cashInput) > 0 && parseFloat(cashInput) < amount && (
                <p className="text-sm text-red-600 mt-1">
                  Недостаточно средств
                </p>
              )}
            </div>
          )}

          {/* Разделение оплаты */}
          {method === 'MIXED' && (
            <div className="space-y-2.5 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Разделение оплаты
              </p>
              
              <div>
                <Label className="text-sm">Наличными (₸)</Label>
                <Input
                  type="number"
                  {...register('cashAmount', { valueAsNumber: true })}
                  className="mt-1.5"
                  placeholder="0"
                  onChange={(e) => {
                    const cash = parseFloat(e.target.value) || 0;
                    setValue('cashAmount', cash);
                    setValue('cardAmount', amount - cash);
                  }}
                />
              </div>

              <div>
                <Label className="text-sm">Картой (₸)</Label>
                <Input
                  type="number"
                  {...register('cardAmount', { valueAsNumber: true })}
                  className="mt-1.5"
                  placeholder="0"
                  onChange={(e) => {
                    const card = parseFloat(e.target.value) || 0;
                    setValue('cardAmount', card);
                    setValue('cashAmount', amount - card);
                  }}
                />
              </div>

              <div>
                <Label className="text-sm">Тип карты</Label>
                <Select
                  value={watch('cardType')}
                  onValueChange={(value) => setValue('cardType', value as any)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KASPI">Kaspi Pay</SelectItem>
                    <SelectItem value="CARD">Halyk Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="pt-2 border-t border-blue-300">
                <div className="flex justify-between text-xs">
                  <span>Наличными:</span>
                  <span className="font-medium">{cashAmount.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Картой:</span>
                  <span className="font-medium">{cardAmount.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-blue-300 mt-1">
                  <span>Итого:</span>
                  <span className={Math.abs(cashAmount + cardAmount - amount) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                    {(cashAmount + cardAmount).toLocaleString()} ₸
                  </span>
                </div>
                {Math.abs(cashAmount + cardAmount - amount) >= 0.01 && (
                  <p className="text-xs text-red-600 mt-1">
                    Сумма должна равняться {amount.toLocaleString()} ₸
                  </p>
                )}
              </div>
            </div>
          )}

          {errors.cashAmount && (
            <p className="text-xs text-red-600">{errors.cashAmount.message}</p>
          )}

          {/* Кнопки */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                mutation.isPending ||
                (method === 'CASH' && (parseFloat(cashInput) < amount || !cashInput)) ||
                (method === 'MIXED' && (
                  cashAmount <= 0 || 
                  cardAmount <= 0 || 
                  Math.abs(cashAmount + cardAmount - amount) > 0.01
                ))
              }
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Принять оплату
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
