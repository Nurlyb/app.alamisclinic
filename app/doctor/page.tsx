'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoctorAppointments } from '@/components/doctor/DoctorAppointments';
import { DoctorPatients } from '@/components/doctor/DoctorPatients';
import { DoctorOperations } from '@/components/doctor/DoctorOperations';

export default function DoctorPage() {
  const { user } = useAuth();

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
          <TabsTrigger value="services">Мои операции</TabsTrigger>
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
              <CardTitle>Мои операции</CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorOperations />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
