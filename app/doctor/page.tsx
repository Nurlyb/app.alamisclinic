'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DoctorAppointments } from '@/components/doctor/DoctorAppointments';
import { DoctorPatients } from '@/components/doctor/DoctorPatients';
import { DoctorServices } from '@/components/doctor/DoctorServices';
import { DoctorServiceForm } from '@/components/doctor/DoctorServiceForm';

export default function DoctorPage() {
  const { user } = useAuth();
  const [showServiceForm, setShowServiceForm] = useState(false);

  if (!user || (user.role !== 'DOCTOR' && user.role !== 'ASSISTANT')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              У вас нет доступа к этой странице
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {user.role === 'ASSISTANT' ? 'Панель ассистента' : 'Панель доктора'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user.role === 'ASSISTANT' 
              ? 'Управление пациентами и записями вашего доктора'
              : 'Управление вашими пациентами и услугами'
            }
          </p>
        </div>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Мои записи</TabsTrigger>
          <TabsTrigger value="patients">Мои пациенты</TabsTrigger>
          <TabsTrigger value="services">Мои услуги</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <DoctorAppointments />
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <DoctorPatients />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Мои услуги</CardTitle>
                {user.role === 'DOCTOR' && (
                  <Button onClick={() => setShowServiceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить услугу
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DoctorServices />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showServiceForm && (
        <DoctorServiceForm
          onClose={() => setShowServiceForm(false)}
          onSuccess={() => {
            setShowServiceForm(false);
          }}
        />
      )}
    </div>
  );
}
