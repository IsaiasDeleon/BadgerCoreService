import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const ServiciosListaScreen = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [busquedaFolio, setBusquedaFolio] = useState('');
  const [cargando, setCargando] = useState(false);

  const [open, setOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [dropdownItems, setDropdownItems] = useState([]);

  const [userId, setUserId] = useState(null);
  useEffect(() => {
    cargarUsuario();
    fetchClientes();
  }, []);
  
  const cargarUsuario = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    if (usuario) {
      const parsed = JSON.parse(usuario);
      setUserId(parsed.id);
  
      // ⏬ Llamamos a buscarServicios apenas obtenemos el ID del usuario
      buscarServicios(parsed.id);
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      const nuevoId = navigation.getState()?.routes?.find(r => r.name === 'Servicios')?.params?.nuevoId;
      console.log(nuevoId)
      if (nuevoId) {
        buscarServicios(userId, () => {
          navigation.navigate('DetalleServicio', { idServicio: nuevoId });
        });
      } else {
        buscarServicios();
      }
    }, [navigation, userId])
  );
  
  const buscarServicios = async (idU = userId) => {
    setCargando(true);
  
    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/servicios.php?v=2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `idCliente=${clienteSeleccionado || ''}&folio=${busquedaFolio}&idUsuario=${idU}`,
      });
      const data = await res.json();
      console.log(data)
      setServicios(data);
    } catch (error) {
      console.error('Error al buscar servicios:', error);
    
    }
  
    setCargando(false);
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/clientes.php?v=1', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      const data = JSON.parse(text);
      setClientes(data);
      const opciones = data.map((c) => ({
        label: c.nombre,
        value: c.id,
      }));
      setDropdownItems(opciones);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };



  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.botonAgregar}
        onPress={() => navigation.navigate('NuevoServicio')}
      >
        <Text style={styles.botonTexto}>+ Nuevo Servicio</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Servicios Realizados</Text>

      <Text style={styles.label}>Cliente</Text>
      <DropDownPicker
        open={open}
        value={clienteSeleccionado}
        items={dropdownItems}
        setOpen={setOpen}
        setValue={setClienteSeleccionado}
        setItems={setDropdownItems}
        placeholder="Selecciona un cliente"
        searchable={true}
        searchPlaceholder="Buscar cliente..."
        style={{ marginBottom: open ? 240 : 12 }}
        zIndex={3000}
        zIndexInverse={1000}
      />

      {clienteSeleccionado !== null && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Buscar por folio"
            placeholderTextColor="#000"
            value={busquedaFolio}
            onChangeText={setBusquedaFolio}
          />

          <TouchableOpacity style={styles.botonBuscar} onPress={buscarServicios}>
            <Text style={styles.botonTexto}>Buscar</Text>
          </TouchableOpacity>
        </>
      )}

      {cargando ? (
        <ActivityIndicator size="large" color="#205c98" />
      ) : (
        <ScrollView>
          {servicios.map((serv, idx) => (
  <TouchableOpacity
    key={idx}
    style={[
      styles.card,
      serv.Terminado == 1 && styles.cardTerminado // Aplica estilo si está terminado
    ]}
    onPress={() => navigation.navigate('DetalleServicio', { idServicio: serv.id })}
  >
    <Text style={styles.cardTitle}>Folio: {serv.folio}</Text>
    <Text style={styles.cardText}>Cliente: {serv.cliente}</Text>
    <Text style={styles.cardText}>Ubicación: {serv.ubicacion}</Text>
    <Text style={styles.cardText}>
      Descripción del servicio:  
      <Text style={[styles.cardText, { fontWeight: 'bold', color: '#205c98' }]}>
        {serv.descripcionServicio}
      </Text>
    </Text>
    <Text style={styles.cardText}>Fecha registro: {serv.fechaInicio}</Text>

    {serv.Terminado == 1 && (
      <>
      <Text style={styles.textoTerminado}>✅ Servicio Terminado</Text>
      <TouchableOpacity
        style={styles.botonPDF}
        onPress={() => {
          const url = `https://toolshop.cloud/Badger/controlador/PDF/Test.php?id=${serv.id}`;
          Linking.openURL(url);
        }}
      >
        <Text style={styles.botonTexto}>Ver PDF</Text>
      </TouchableOpacity>
    </>
    )}
  </TouchableOpacity>
))}

        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#205c98',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
    color: '#000',
  },
  botonBuscar: {
    backgroundColor: '#205c98',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  botonAgregar: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#205c98',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
  },
  cardTerminado: {
    backgroundColor: '#d4edda',  // Verde claro indicando completado
    borderLeftColor: '#28a745',  // Verde para el borde izquierdo
  },
  textoTerminado: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#28a745',
  },
  botonPDF: {
    backgroundColor: '#205c98',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  
  
});

export default ServiciosListaScreen;
