import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const PerfilScreen = ({ user, setUser }) => {
  const [usuario, setUsuario] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = async () => {
    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `usuario=${encodeURIComponent(usuario)}&pwd=${encodeURIComponent(pass)}`
      });
  
      const text = await res.text();
      const data = JSON.parse(text);
  
      if (data.status === 'success') {
        await AsyncStorage.setItem('usuario', JSON.stringify(data.user));
        setUser(data.user);
  
        Toast.show({
          type: 'success',
          text1: 'Bienvenido',
          text2: data.user.nombre || 'Inicio de sesión exitoso'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'Error al iniciar sesión'
        });
      }
    } catch (error) {
      console.error('Error en login:', error);
      Toast.show({
        type: 'error',
        text1: 'Error de conexión',
        text2: 'No se pudo conectar con el servidor'
      });
    }
  };
  const handleLogout = async () => {
    await AsyncStorage.removeItem('usuario');
    setUser(null);
  };

  if (user) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={{ uri: user.img }} style={styles.profileImage} />
        <View style={styles.card}>
          <Text style={styles.label}>👤 Nombre:</Text>
          <Text style={styles.value}>{user.nombre}</Text>

          <Text style={styles.label}>📧 Usuario:</Text>
          <Text style={styles.value}>{user.usuario}</Text>

          <Text style={styles.label}>📱 Teléfono:</Text>
          <Text style={styles.value}>{user.Celular}</Text>

          <Text style={styles.label}>💼 Puesto:</Text>
          <Text style={styles.value}>{user.puesto}</Text>

          <Text style={styles.label}>📍 Sede:</Text>
          <Text style={styles.value}>{user.Sede}</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Iniciar Sesión</Text>
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
        placeholderTextColor="#bbb"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        placeholderTextColor="#bbb"
      />
      <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
        <Text style={styles.loginText}>Entrar</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f6fc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#205c98',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    color: '#000',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#205c98',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileImage: {
    width: 250,
    height: 250,
    borderRadius: 80,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#205c98',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    width: '100%',
    borderRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  label: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 8,
  },
  value: {
    color: '#222',
    fontSize: 16,
    marginBottom: 6,
  },
  logoutButton: {
    backgroundColor: '#d9534f',
    padding: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default PerfilScreen;
