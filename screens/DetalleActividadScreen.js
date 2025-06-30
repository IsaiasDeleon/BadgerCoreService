import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal, LogBox
} from 'react-native';
import {
  NestableScrollContainer,
  NestableDraggableFlatList
} from 'react-native-draggable-flatlist';
import Toast from 'react-native-toast-message';
import RenderHTML from 'react-native-render-html';
import { Dimensions } from 'react-native';

const parseWhatsAppFormat = (texto) => {
  let html = texto;
  html = html.replace(/\*(.*?)\*/g, '<b>$1</b>');
  html = html.replace(/_(.*?)_/g, '<i>$1</i>');
  html = html.replace(/~(.*?)~/g, '<s>$1</s>');
  html = html.replace(/(^\s*\*\s.*(\n|$))+/gm, match => {
    const items = match.trim().split('\n').map(line => `<li>${line.replace(/^\s*\*\s/, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  html = html.replace(/(^\s*\d+\.\s.*(\n|$))+/gm, match => {
    const items = match.trim().split('\n').map(line => `<li>${line.replace(/^\s*\d+\.\s/, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });
  html = html.replace(/\n/g, '<br>');
  return html;
};

const DetalleActividadScreen = ({ route }) => {
  const { actividad } = route.params;
  const [formData, setFormData] = useState({ ...actividad });
  const [fotos, setFotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [descripcionEditando, setDescripcionEditando] = useState('');
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);

  LogBox.ignoreLogs(['ref.measureLayout must be called with a ref to a native component']);

  useEffect(() => { fetchFotos(); }, [actividad.id]);

  const fetchFotos = async () => {
    try {
      const res = await fetch(`https://toolshop.cloud/Badger/controlador/backMovil/getFotosActividad.php?idActividad=${actividad.id}`);
      const data = await res.json();
      if (data.status === 'success') setFotos(data.fotos);
    } catch (error) { console.error('Error al cargar fotos:', error); }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const guardarCambios = async () => {
    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/updateActividad.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      Toast.show({
        type: data.status === 'success' ? 'success' : 'error',
        text1: data.status === 'success' ? 'Éxito' : 'Error',
        text2: data.status === 'success' ? 'Actividad actualizada correctamente' : 'No se pudo actualizar la actividad'
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Error de conexión', text2: 'No se pudo conectar al servidor' });
    }
  };

  const actualizarOrdenImagenes = async (nuevoOrden) => {
    setFotos(nuevoOrden);
    const cuerpo = nuevoOrden.map((foto, index) => ({ id: foto.id, paso: index + 1 }));
    try {
      await fetch('https://toolshop.cloud/Badger/controlador/backMovil/updateOrdenFotos.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    } catch (error) {
      console.error('Error al actualizar el orden:', error);
    }
  };

  const guardarDescripcion = async () => {
    if (!fotoSeleccionada) return;
    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/updateDescripcionFoto.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fotoSeleccionada.id, descripcion: descripcionEditando }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setFotos(fotos.map(f => f.id === fotoSeleccionada.id ? { ...f, descripcion: descripcionEditando } : f));
        setModalVisible(false);
        Toast.show({ type: 'success', text1: 'Descripción actualizada' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar la descripción' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error de conexión', text2: 'No se pudo conectar al servidor' });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <NestableScrollContainer style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>✏️ Editar Actividad</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Descripción (*negrita*, _cursiva_, ~tachado~, listas)</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={formData.descripcion}
              onChangeText={(text) => handleChange('descripcion', text)}
              multiline
            />

            {formData.descripcion.trim().length > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Vista previa:</Text>
                <RenderHTML
                  contentWidth={Dimensions.get('window').width - 50}
                  source={{ html: `<div>${parseWhatsAppFormat(formData.descripcion)}</div>` }}
                  tagsStyles={{ b: { fontWeight: 'bold' }, i: { fontStyle: 'italic' }, s: { textDecorationLine: 'line-through' }, li: { marginLeft: 15 }, ul: { paddingLeft: 10 } }}
                />
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.button} onPress={guardarCambios}>
            <Text style={styles.buttonText}>💾 Guardar Cambios</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>📷 Imágenes</Text>
        </ScrollView>

        <View style={{ height: 500, paddingVertical: 10 }}>
          <NestableDraggableFlatList
            data={fotos}
            horizontal
            keyExtractor={(item, index) => item?.id?.toString() ?? `foto-${index}`}
            onDragEnd={({ data }) => actualizarOrdenImagenes(data)}
            renderItem={({ item, drag, isActive }) => (
              <View style={[styles.imageContainer, isActive && { backgroundColor: '#d0e6ff' }]} onTouchStart={drag}>
                <Image source={{ uri: item.urlImagen }} style={styles.image} />
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }} onPress={() => { setFotoSeleccionada(item); setDescripcionEditando(item.descripcion || ''); setModalVisible(true); }}>
                  <Text style={styles.imageDesc} numberOfLines={2}>{item.descripcion}</Text>
                  <Text style={{ fontSize: 16, marginLeft: 6 }}>✏️</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Descripción</Text>
              <TextInput multiline numberOfLines={4} value={descripcionEditando} onChangeText={setDescripcionEditando} style={styles.modalInput} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#6c757d' }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={guardarDescripcion} style={{ marginTop: 16, backgroundColor: '#007bff', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </NestableScrollContainer>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6fc', padding: 16 },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#205c98', marginBottom: 20 },
    sectionTitle: { marginTop: 24, fontSize: 18, fontWeight: 'bold', color: '#205c98' },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    label: { fontWeight: 'bold', marginTop: 10, color: '#555' },
    value: { fontSize: 16, color: '#333', marginTop: 2 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, fontSize: 16, color: '#000', backgroundColor: '#fff' },
    imageContainer: { marginRight: 15, alignItems: 'center' },
    image: { width: 150, height: 150, borderRadius: 6, borderColor: '#ccc', borderWidth: 1 },
    imageDesc: { fontSize: 12, color: '#333', maxWidth: 100 },
    button: { backgroundColor: '#205c98', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: 'top', minHeight: 80, backgroundColor: '#f9f9f9' },
    previewBox: { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', borderWidth: 1, borderRadius: 6, padding: 12, marginTop: 16 },
    previewTitle: { fontWeight: 'bold', color: '#0c5460', marginBottom: 6 },
  });
  
export default DetalleActividadScreen;
