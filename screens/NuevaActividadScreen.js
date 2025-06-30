import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  NestableScrollContainer,
  NestableDraggableFlatList
} from 'react-native-draggable-flatlist';
import Toast from 'react-native-toast-message';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';

const NuevaActividadScreen = ({ route, navigation }) => {
  const { idServicio } = route.params;
  const { width } = useWindowDimensions();

  const [descripcion, setDescripcion] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [descripcionEditando, setDescripcionEditando] = useState('');
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(false);

  const seleccionarImagenes = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }, (response) => {
      if (!response.didCancel && !response.errorCode) {
        const nuevas = response.assets.map(asset => ({
          ...asset,
          descripcion: ''
        }));
        setImagenes(prev => [...prev, ...nuevas]);
      }
    });
  };
  const parseWhatsAppFormat = (texto) => {
    let html = texto;
  
    html = html.replace(/\*(.*?)\*/g, '<b>$1</b>');
    html = html.replace(/_(.*?)_/g, '<i>$1</i>');
    html = html.replace(/~(.*?)~/g, '<s>$1</s>');
  
    // Listas con *, normales
    html = html.replace(/(^\s*\*\s.*(\n|$))+/gm, match => {
      const items = match.trim().split('\n').map(line =>
        `<li>${line.replace(/^\s*\*\s/, '')}</li>`
      ).join('');
      return `<ul>${items}</ul>`;
    });
  
    // Listas numeradas, respetando inicio
    html = html.replace(/(^\s*\d+\.\s.*(\n|$))+/gm, match => {
      const lines = match.trim().split('\n');
      const firstLine = lines[0];
      const startMatch = firstLine.match(/^\s*(\d+)\./);
      const startNum = startMatch ? parseInt(startMatch[1]) : 1;
  
      const items = lines.map(line => {
        const textoMatch = line.match(/^\s*\d+\.\s+(.*)$/);
        return `<li>${textoMatch ? textoMatch[1] : line}</li>`;
      }).join('');
  
      return `<ol start="${startNum}">${items}</ol>`;
    });
  
    html = html.replace(/\n/g, '<br>');
  
    return html;
  };
  

  const guardarActividad = async () => {
    if (cargando) return;
    if (!descripcion) {
      Toast.show({ type: 'error', text1: 'Campo obligatorio', text2: 'La descripción es obligatoria.' });
      return;
    }

    setCargando(true);

    const body = `idServicio=${idServicio}&descripcion=${encodeURIComponent(descripcion)}`;

    try {
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/actividades_mantenimiento.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      const data = await res.json();

      if (data.status === 'success' && data.idActividad) {
        const idActividad = data.idActividad;

        for (const img of imagenes) {
          const uriParts = img.uri.split('.');
          const extension = uriParts[uriParts.length - 1];
          const fileType = img.type || `image/${extension}`;
          const fileName = img.fileName || `foto_${Date.now()}.${extension}`;

          const formData = new FormData();
          formData.append('foto', { uri: img.uri, type: fileType, name: fileName });
          formData.append('idServicio', idServicio);
          formData.append('idActividad', idActividad);
          formData.append('descripcion', img.descripcion || '');

          const resImg = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/subirImagenActividad.php', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const resJson = await resImg.json();
          if (resJson.status !== 'success') {
            console.warn('Imagen no subida:', resJson.message);
          }
        }

        Toast.show({ type: 'success', text1: 'Actividad guardada', text2: 'La actividad se guardó correctamente.' });
        setTimeout(() => navigation.goBack(), 1500);

      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'No se pudo guardar la actividad' });
      }

    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error de red', text2: 'No se pudo conectar con el servidor' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <NestableScrollContainer style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>📝 Nueva Actividad</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Descripción (*negrita*, _cursiva_, ~tachado~, listas)</Text>
            <TextInput
              style={[styles.input, { height: 120 }]}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              placeholder="Ejemplo: *Importante* _Nota_ ~Error~\n* Tarea 1\n1. Paso 1"
            />

            {descripcion.trim().length > 0 && (
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>Vista previa:</Text>
                <RenderHtml
                  contentWidth={width}
                  source={{ html: `<div>${parseWhatsAppFormat(descripcion)}</div>` }}
                  tagsStyles={{
                    b: { fontWeight: 'bold' },
                    i: { fontStyle: 'italic' },
                    s: { textDecorationLine: 'line-through' },
                    li: { marginLeft: 15, marginBottom: 4 },
                    ul: { paddingLeft: 10 }
                  }}
                />
              </View>
            )}
          </View>

          <TouchableOpacity onPress={seleccionarImagenes} style={styles.button}>
            <Text style={styles.buttonText}>+ Agregar Evidencias</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>📷 Imágenes</Text>
        </ScrollView>

        <View style={{ height: 300, paddingVertical: 10 }}>
          <NestableDraggableFlatList
            data={imagenes}
            horizontal
            keyExtractor={(item, index) => item.uri + index}
            onDragEnd={({ data }) => setImagenes(data)}
            renderItem={({ item, drag, isActive }) => (
              <View style={[styles.imageContainer, isActive && { backgroundColor: '#d0e6ff' }]} onTouchStart={drag}>
                <Image source={{ uri: item.uri }} style={styles.image} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setFotoSeleccionada(item);
                      setDescripcionEditando(item.descripcion || '');
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.imageDesc} numberOfLines={2}>{item.descripcion}</Text>
                    <Text style={{ fontSize: 16, marginLeft: 6 }}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>

        <TouchableOpacity style={[styles.button, cargando && { backgroundColor: '#888' }]} onPress={guardarActividad} disabled={cargando}>
          <Text style={styles.buttonText}>{cargando ? 'Guardando...' : '💾 Guardar Actividad'}</Text>
        </TouchableOpacity>
      </NestableScrollContainer>

      {/* Modal edición descripción imagen */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Descripción</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={descripcionEditando}
              onChangeText={setDescripcionEditando}
              style={styles.modalInput}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#6c757d' }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const nuevas = imagenes.map(img =>
                    img === fotoSeleccionada ? { ...img, descripcion: descripcionEditando } : img
                  );
                  setImagenes(nuevas);
                  setModalVisible(false);
                }}
                style={{ marginTop: 16, backgroundColor: '#007bff', padding: 10, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fc', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#205c98', marginBottom: 20 },
  sectionTitle: { marginTop: 24, fontSize: 18, fontWeight: 'bold', color: '#205c98' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, marginBottom: 10
  },
  label: { fontWeight: 'bold', marginTop: 10, color: '#555' },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
    padding: 8, fontSize: 16, color: '#000', backgroundColor: '#fff'
  },
  alertInfo: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 16
  },
  alertTitle: {
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 6
  },
  imageContainer: { marginRight: 15, alignItems: 'center' },
  image: { width: 150, height: 150, borderRadius: 6, borderColor: '#ccc', borderWidth: 1 },
  imageDesc: { fontSize: 12, color: '#333', maxWidth: 100 },
  button: {
    backgroundColor: '#205c98', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalInput: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10,
    fontSize: 14, textAlignVertical: 'top', minHeight: 80, backgroundColor: '#f9f9f9'
  }
});

export default NuevaActividadScreen;
