'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, User, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { OperationDetailsModal } from '@/components/schedule/OperationDetailsModal';

interface Operation {
  id: string;
  status: string;
  scheduledDate: string;
  price: number;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  patient: {
    id: string;
    fullName: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
  assistant?: {
    id: string;
    name: string;
  };
}

export function DoctorOperations() {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadOperations();
  }, []);

  const loadOperations = async () => {
    try {
      setLoading(true);
      
      // Загружаем назначенные операции доктора
      const response = await api.get(`/api/doctor-service-assignments?doctorId=${user?.id}&status=PAID,IN_PROGRESS`) as { data?: Operation[] };
      setOperations(response.data || []);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOperation = async (operationId: string) => {
    try {
      const response = await api.patch(`/api/doctor-service-assignments/${operationId}/start`, {});
      
      if (response) {
        toast.success('Операция начата');
        loadOperations();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при начале операции');
    }
  };

  const handleCompleteOperation = async (operationId: string) => {
    try {
      // Для завершения операции нужно указать длительность
      const startTime = operations.find(op => op.id === operationId)?.startedAt;
      let duration = 60; // По умолчанию 60 минут
      
      if (startTime) {
        const start = new Date(startTime);
        const now = new Date();
        duration = Math.round((now.getTime() - start.getTime()) / (1000 * 60)); // в минутах
      }
      
      const response = await api.patch(`/api/doctor-service-assignments/${operationId}/complete`, {
        duration
      });
      
      if (response) {
        toast.success('Операция завершена');
        loadOperations();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка при завершении операции');
    }
  };

  const handleShowDetails = (operation: Operation) => {
    setSelectedOperation(operation);
    setShowDetailsModal(true);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка операций...</div>;
  }

  if (operations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        У вас нет назначенных операций на сегодня.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {operations.map((operation) => (
        <div
          key={operation.id}
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-medium">{operation.service.name}</span>
              <Badge 
                variant={
                  operation.status === 'PAID' ? 'secondary' :
                  operation.status === 'IN_PROGRESS' ? 'default' :
                  'outline'
                }
              >
                {operation.status === 'PAID' ? 'Оплачено' :
                 operation.status === 'IN_PROGRESS' ? 'В процессе' :
                 operation.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {operation.patient.fullName}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(operation.scheduledDate), 'dd.MM.yyyy HH:mm', { locale: ru })}
              </div>
              <div>
                Цена: {operation.price.toLocaleString()} ₸
              </div>
              {operation.assistant && (
                <div>
                  Ассистент: {operation.assistant.name}
                </div>
              )}
            </div>
            
            {operation.notes && (
              <div className="text-sm text-muted-foreground mt-1">
                Примечания: {operation.notes}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleShowDetails(operation)}
            >
              <Info className="h-4 w-4 mr-1" />
              Детали
            </Button>
            
            {operation.status === 'PAID' && (
              <Button
                size="sm"
                onClick={() => handleStartOperation(operation.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-1" />
                Начать
              </Button>
            )}
            
            {operation.status === 'IN_PROGRESS' && (
              <Button
                size="sm"
                onClick={() => handleCompleteOperation(operation.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Square className="h-4 w-4 mr-1" />
                Завершить
              </Button>
            )}
          </div>
        </div>
      ))}
      
      <OperationDetailsModal
        operation={selectedOperation}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOperation(null);
        }}
      />
    </div>
  );
}