import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ViaticosScreen from './screens/ViaticosScreen';
import PerfilScreen from './screens/PerfilScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import ServicioStack from './ServicioStack'; // 📌 Nuevo stack importado
import Toast from 'react-native-toast-message';
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      const json = await AsyncStorage.getItem('usuario');
      if (json) setUser(JSON.parse(json));
    };
    loadSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName = 'home';
              if (route.name === 'Servicio') iconName = 'construct';
              else if (route.name === 'Viaticos') iconName = 'cash';
              else if (route.name === 'Perfil') iconName = 'person';
              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#205c98',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen
            name="Servicio"
            component={ServicioStack}
            options={{ headerShown: false }}
          />
          <Tab.Screen name="Viaticos" component={ViaticosScreen} />
          <Tab.Screen name="Perfil">
            {() => <PerfilScreen user={user} setUser={setUser} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      <Toast />
    </GestureHandlerRootView>
  );
}

