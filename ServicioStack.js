import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ServicioScreen from './screens/ServicioScreen';
import NuevoServicioScreen from './screens/NuevoServicioScreen';
import DetalleServicioScreen from './screens/DetalleServicioScreen';
import NuevaActividadScreen from './screens/NuevaActividadScreen';
import DetalleActividadScreen from './screens/DetalleActividadScreen';
import QRServicio from './screens/QRServicio'; // ✅ Agregar QRServicio

const Stack = createNativeStackNavigator();

export default function ServicioStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Servicios"
        component={ServicioScreen}
        options={{ title: 'Servicios' }}
      />
      <Stack.Screen
        name="NuevoServicio"
        component={NuevoServicioScreen}
        options={{ title: 'Nuevo Servicio' }}
      />
      <Stack.Screen
        name="DetalleServicio"
        component={DetalleServicioScreen}
        options={{ title: 'Detalle del Servicio' }}
      />
      <Stack.Screen
        name="NuevaActividad"
        component={NuevaActividadScreen}
        options={{ title: 'Nueva Actividad' }}
      />
      <Stack.Screen
        name="DetalleActividad"
        component={DetalleActividadScreen}
      />
      <Stack.Screen
        name="QRServicio"
        component={QRServicio}
        options={{ title: 'Escanear QR' }}
      />
    </Stack.Navigator>
  );
}
