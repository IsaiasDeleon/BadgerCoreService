import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
const NuevoServicioScreen = ({ navigation, route }) => {


  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [openCliente, setOpenCliente] = useState(false);
  const [dropdownClientes, setDropdownClientes] = useState([]);

  const [ubicacion, setUbicacion] = useState('');
  const [contactos, setContactos] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [openContacto, setOpenContacto] = useState(false);
  const [dropdownContactos, setDropdownContactos] = useState([]);
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  const [openObjeto, setOpenObjeto] = useState(false);
  const [objeto, setObjeto] = useState(null);
  const [dropdownObjetos, setDropdownObjetos] = useState([]);
  const [datosObjeto, setDatosObjeto] = useState([]);

  const [openTipo, setOpenTipo] = useState(false);
  const [tipoServicio, setTipoServicio] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [tiposServicio] = useState([
    { label: 'Servicio Correctivo', value: 'Correctivo' },
    { label: 'Servicio Preventivo', value: 'Preventivo' },
    { label: 'Revisión de rutina', value: 'Revisión' },
    { label: 'Capacitación', value: 'Capacitación' },
    { label: 'Actualización de software', value: 'Software' },
    { label: 'Instalación de equipo', value: 'Instalación' },
    { label: 'Ajuste de parámetros', value: 'Ajuste' },
    { label: 'Calibración de sensores', value: 'Calibración' },
    { label: 'Otro', value: 'Otro' },
  ]);

  const [estadoInicial, setEstadoInicial] = useState('');
  const [folio, setFolio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenes, setImagenes] = useState([]);

  useEffect(() => {
    fetch('https://toolshop.cloud/Badger/controlador/backMovil/clientes.php?v=1')
      .then(res => res.json())
      .then(data => {
        const opciones = data.map(c => ({
          label: c.nombre,
          value: c.id,
        }));
        setClientes(data);
        setDropdownClientes(opciones);
      });
  }, []);
  useEffect(() => {
    if (route?.params?.idCliente) {
      setCliente(route.params.idCliente);
      obtenerContactos(route.params.idCliente);
      const seleccionado = clientes.find(c => c.id == route.params.idCliente);
      if (seleccionado) setUbicacion(seleccionado.direccion || '');
  
      // Espera a que los objetos carguen y luego selecciona el objeto
      obtenerObjetos(route.params.idCliente, route.params?.idObjeto || null);
    }
  }, [route.params, clientes]);
  
  
  
  const obtenerContactos = (idCliente) => {
    fetch(`https://toolshop.cloud/Badger/controlador/backMovil/contactosCliente.php?idCliente=${idCliente}`)
      .then(res => res.json())
      .then(data => {
        const activos = data.filter(c => c.estatus === 'Activo');
        const opciones = activos.map(c => ({ label: c.nombre, value: c.id }));
        setContactos(activos);
        setDropdownContactos(opciones);
        setContacto(null);
        setContactoNombre('');
        setContactoTelefono('');
      });
  };

  const obtenerObjetos = (idEmpresa, idObjetoSeleccionado = null) => {
    fetch(`https://toolshop.cloud/Badger/controlador/backMovil/objetosEmpresa.php?idEmpresa=${idEmpresa}`)
      .then(res => res.json())
      .then(data => {
        const opciones = data.map(o => ({ label: o.nombre, value: o.id }));
        setDropdownObjetos(opciones);
        setObjeto(null);
        setDatosObjeto([]);
  
        if (idObjetoSeleccionado) {
          setObjeto(idObjetoSeleccionado);
          obtenerDatosObjeto(idObjetoSeleccionado);
        }
      });
  };
  

  const obtenerDatosObjeto = (idObjeto) => {
    fetch(`https://toolshop.cloud/Badger/controlador/backMovil/datosExtraObjeto.php?idObjeto=${idObjeto}`)
      .then(res => res.json())
      .then(setDatosObjeto);
  };

  const guardarNuevoContacto = () => {
    if (!nuevoNombre || !nuevoTelefono) {
      return Toast.show({
        type: 'error',
        text1: 'Campos obligatorios',
        text2: 'Nombre y teléfono son requeridos'
      });
    }
  
    fetch('https://toolshop.cloud/Badger/controlador/backMovil/agregarContacto.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `idCliente=${cliente}&nombre=${encodeURIComponent(nuevoNombre)}&telefono=${encodeURIComponent(nuevoTelefono)}&correo=${encodeURIComponent(nuevoCorreo)}&estatus=Activo`
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setModalVisible(false);
          setNuevoNombre('');
          setNuevoTelefono('');
          setNuevoCorreo('');
          obtenerContactos(cliente);
  
          Toast.show({
            type: 'success',
            text1: 'Contacto agregado',
            text2: 'El contacto se guardó correctamente'
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'No se pudo agregar el contacto'
          });
        }
      })
      .catch(err => {
        console.error(err);
        Toast.show({
          type: 'error',
          text1: 'Error de red',
          text2: 'No se pudo conectar con el servidor'
        });
      });
  };
  const seleccionarImagenes = () => {
    launchImageLibrary({ selectionLimit: 0, mediaType: 'photo' }, (response) => {
      if (response.didCancel || response.errorCode) return;
      const nuevas = response.assets?.map(a => a.uri) || [];
      setImagenes(prev => [...prev, ...nuevas]);
    });
  };
  const guardarServicio = async () => {
    if (cargando) return;
  
    if (!cliente || !contacto || !objeto || !tipoServicio || !descripcion) {
      return Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Por favor completa todos los campos obligatorios.'
      });
    }
  
    setCargando(true);
  
    try {
      const usuarioStr = await AsyncStorage.getItem('usuario');
      const usuario = JSON.parse(usuarioStr);
      const idUsuario = usuario?.id;
  
      if (!idUsuario) {
        setCargando(false);
        return Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo obtener el usuario, inicia sesión nuevamente.'
        });
      }
  
      const body = `idCliente=${cliente}&idContacto=${contacto}&idObjeto=${objeto}&tipoServicio=${encodeURIComponent(tipoServicio)}&descripcion=${encodeURIComponent(descripcion)}&estadoInicial=${encodeURIComponent(estadoInicial)}&idUsuario=${idUsuario}`;
  
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/guardarServicio.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
  
      const text = await res.text();
      const data = JSON.parse(text);
  
      if (data.status === 'success') {
        const idServicio = data.id;
  
        for (const uri of imagenes) {
          const formData = new FormData();
          formData.append('idServicio', idServicio);
          formData.append('descripcion', 'estadoInicial');
          formData.append('paso', 0);
          formData.append('imagen', {
            uri,
            type: 'image/jpeg',
            name: `estado_${Date.now()}.jpg`
          });
  
          await fetch('https://toolshop.cloud/Badger/controlador/backMovil/subirImagenServicio.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            body: formData
          });
        }
  
        Toast.show({
          type: 'success',
          text1: 'Servicio guardado',
          text2: 'El servicio se creó correctamente.'
        });
  
        setTimeout(() => {
          navigation.navigate('Servicios');
        }, 1500);
        
  
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message || 'No se pudo guardar el servicio.'
        });
      }
  
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error de red',
        text2: 'No se pudo conectar con el servidor.'
      });
    } finally {
      setCargando(false);
    }
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {modalVisible && (
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <Text style={styles.cardTitle}>Agregar nuevo contacto</Text>
            <TextInput style={styles.input} placeholder="Nombre" value={nuevoNombre} onChangeText={setNuevoNombre} />
            <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={nuevoTelefono} onChangeText={setNuevoTelefono} />
            <TextInput style={styles.input} placeholder="Correo (opcional)" value={nuevoCorreo} onChangeText={setNuevoCorreo} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.botonSecundario, { flex: 1, marginRight: 5 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.botonTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.boton, { flex: 1, marginLeft: 5 }]} onPress={guardarNuevoContacto}>
                <Text style={styles.botonTexto}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}
  keyboardShouldPersistTaps="handled"
  nestedScrollEnabled={true} >
        <Text style={styles.title}>Nuevo Servicio</Text>
        <View style={styles.card}>
       
          <Text style={styles.cardTitle}>Datos del Cliente</Text>
          <TouchableOpacity style={styles.botonEscanear} onPress={() => navigation.navigate('QRServicio')}>
          <Text style={styles.botonTexto}>📷 Escanear QR para autocompletar</Text>
</TouchableOpacity>

          <Text style={styles.label}>Cliente</Text>
          <DropDownPicker
            open={openCliente}
            value={cliente}
            items={dropdownClientes}
            setOpen={setOpenCliente}
            setValue={setCliente}
            setItems={setDropdownClientes}
            placeholder="Selecciona un cliente"
            searchable
            listMode="SCROLLVIEW"
            zIndex={3000}
            zIndexInverse={1000}
            onChangeValue={(val) => {
              const seleccionado = clientes.find(c => c.id == val);
              if (seleccionado) setUbicacion(seleccionado.direccion || '');
              setCliente(val);
              obtenerContactos(val);
              obtenerObjetos(val);
            }}
          />

          <Text style={styles.label}>Ubicación</Text>
          <TextInput style={styles.input} value={ubicacion} editable={false} />

          <View style={{ height: 3, backgroundColor: '#2e86c1', marginVertical: 12, borderRadius: 10 }} />

          <Text style={styles.label}>Contacto</Text>
          <DropDownPicker
            open={openContacto}
            value={contacto}
            items={[...dropdownContactos, { label: '➕ Agregar contacto nuevo', value: 'nuevo' }]}
            setOpen={setOpenContacto}
            setValue={(callback) => {
              const nuevoValor = typeof callback === 'function' ? callback(contacto) : callback;
              if (nuevoValor === 'nuevo') return setModalVisible(true);
              setContacto(nuevoValor);
              const sel = contactos.find(c => c.id == nuevoValor);
              setContactoNombre(sel?.nombre || '');
              setContactoTelefono(sel?.telefono || '');
            }}
            setItems={setDropdownContactos}
            placeholder="Selecciona un contacto"
            searchable
            listMode="SCROLLVIEW"
            zIndex={4500}
            zIndexInverse={1500}
          />

<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <View style={{ flex: 1, marginRight: 5 }}>
    <Text style={styles.label}>Nombre del Contacto</Text>
    <TextInput
      style={styles.input}
      value={contactoNombre}
      editable={false}
    />
  </View>

  <View style={{ flex: 1, marginLeft: 5 }}>
    <Text style={styles.label}>Teléfono</Text>
    <TextInput
      style={styles.input}
      value={contactoTelefono}
      editable={false}
      keyboardType="phone-pad"
    />
  </View>
</View>

          <View style={{ height: 3, backgroundColor: '#2e86c1', marginVertical: 12, borderRadius: 10 }} />

          <Text style={styles.label}>Objeto</Text>
          <DropDownPicker
            open={openObjeto}
            value={objeto}
            items={dropdownObjetos}
            setOpen={setOpenObjeto}
            setValue={setObjeto}
            setItems={setDropdownObjetos}
            placeholder="Selecciona un objeto"
            searchable
            listMode="SCROLLVIEW"
            zIndex={4000}
            zIndexInverse={1000}
            
            onChangeValue={(val) => {
              setObjeto(val);
              obtenerDatosObjeto(val);
            }}
          />

<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
  {datosObjeto.map((d, idx) => (
    <View key={idx} style={{ width: '48%', marginHorizontal: 5, marginVertical:10 }}>
      <Text style={{ fontWeight: 'bold' }}>{d.titulo}:</Text>
      <Text>{d.texto}</Text>
    </View>
  ))}
</View>

        </View>

        <Text style={styles.label}>Tipo de Servicio</Text>
        <DropDownPicker
          open={openTipo}
          value={tipoServicio}
          items={tiposServicio}
          setOpen={setOpenTipo}
          setValue={setTipoServicio}
          setItems={() => { }}
          placeholder="Selecciona un tipo de servicio"
          listMode="SCROLLVIEW"
          zIndex={1500}
          zIndexInverse={500}
        />

        <Text style={styles.label}>Descripción del servicio (*negrita*, _cursiva_, ~tachado~, listas)</Text>
        <TextInput style={[styles.input, { height: 60 }]} multiline value={descripcion} onChangeText={setDescripcion} />

        <Text style={styles.label}>Estado Inicial (opcional) (*negrita*, _cursiva_, ~tachado~, listas)</Text>
        <TextInput style={[styles.input, { height: 80 }]} multiline value={estadoInicial} onChangeText={setEstadoInicial} />

        <Text style={styles.label}>Evidencia fotográfica (opcional)</Text>
        <TouchableOpacity style={styles.botonSecundario} onPress={seleccionarImagenes}>
          <Text style={styles.botonTexto}>Seleccionar Imágenes</Text>
        </TouchableOpacity>

        <ScrollView horizontal style={{ marginTop: 10 }}>
          {imagenes.map((uri, index) => (
            <View key={index} style={{ position: 'relative', marginRight: 10 }}>
              <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 5 }} />
              <TouchableOpacity onPress={() => setImagenes(img => img.filter((_, i) => i !== index))} style={{ position: 'absolute', top: 0, right: -6, backgroundColor: 'red', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
  style={[styles.boton, cargando && { backgroundColor: '#999' }]}
  onPress={guardarServicio}
  disabled={cargando}
>
  <Text style={styles.botonTexto}>
    {cargando ? 'Guardando...' : 'Guardar Servicio'}
  </Text>
</TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#205c98' },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: { backgroundColor: '#f4f4f4', borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10, color: '#000' },
  boton: { backgroundColor: '#205c98', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  botonSecundario: { backgroundColor: '#999999', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd',  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10, textAlign: 'center' },
  modalFondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 5000, paddingHorizontal: 20 },
  modalContenido: { backgroundColor: '#fff', padding: 20, borderRadius: 8, width: '80%', elevation: 5 },
  botonEscanear: {
    backgroundColor: '#205c98',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  
});

export default NuevoServicioScreen;
