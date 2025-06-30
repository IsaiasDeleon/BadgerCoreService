import React, { useState, useEffect, useRef } from 'react';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Text, View, StyleSheet, Animated, Dimensions, Alert } from 'react-native';
import { useCodeScanner } from 'react-native-vision-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QRServicio = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Activa la cámara para escanear QR.');
      }
    };
    requestPermission();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setIsRedirecting(false);
      setIsActive(true);
      return () => setIsActive(false);
    }, [])
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !isRedirecting) {
        const code = codes[0].value;
        if (code.startsWith('BadgerCore_')) {
          const partes = code.split(':');
          const cliente = partes.find(p => p.startsWith('Cliente_'))?.split('_')[1];
          const objeto = partes.find(p => p.startsWith('Object_'))?.split('_')[1];
            console.log(cliente, "-", objeto)
          if (cliente && objeto) {
            setIsRedirecting(true);
            navigation.navigate('NuevoServicio', { idCliente: cliente, idObjeto: objeto });
          } else {
            setScannedCode('QR incompleto');
          }
        } else {
          setScannedCode('QR NO VÁLIDO');
        }
      }
    },
  });

  if (!hasPermission) {
    return <View style={styles.centered}><Text>Sin permisos de cámara</Text></View>;
  }

  if (!device) {
    return <View style={styles.centered}><Text>No se detecta la cámara</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <SlidingBar />
      </View>
      <Text style={styles.title}>Escanea el QR del objeto</Text>
      <Text style={styles.subtitle}>Se completarán los datos automáticamente</Text>
      <Text style={styles.result}>{scannedCode}</Text>
    </View>
  );
};

const SlidingBar = () => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT - 100,
        duration: 4000,
        useNativeDriver: true,
      }).start(animate);
    };
    animate();
  }, [translateY]);

  return (
    <Animated.View style={[styles.slidingBar, { transform: [{ translateY }] }]} />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center',
  },
  slidingBar: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: 5,
    backgroundColor: 'red', borderRadius: 5,
  },
  title: {
    color: 'white', fontSize: 24, fontWeight: 'bold',
    position: 'absolute', top: 50, alignSelf: 'center',
  },
  subtitle: {
    color: 'white', fontSize: 18,
    position: 'absolute', top: 90, alignSelf: 'center',
  },
  result: {
    color: 'red', fontSize: 18,
    position: 'absolute', bottom: 60, alignSelf: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default QRServicio;
