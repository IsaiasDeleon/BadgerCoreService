import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Modal, TouchableOpacity, Linking, TextInput, FlatList
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import Toast from 'react-native-toast-message';
import RenderHTML from 'react-native-render-html';
import { Dimensions } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
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

const DetalleServicioScreen = ({ route, navigation }) => {
  const { idServicio } = route.params;
  const [servicio, setServicio] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [datosExtra, setDatosExtra] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  const [modalTerminar, setModalTerminar] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [proximoMantenimiento, setProximoMantenimiento] = useState('');
  const [showProximoMant, setShowProximoMant] = useState(false);

  const [openUsuarios, setOpenUsuarios] = useState(false);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
  const [dropdownUsuarios, setDropdownUsuarios] = useState([]);

  const [fechasTrabajo, setFechasTrabajo] = useState([]);  // Array de {fecha, horaInicio, horaFin}
  const [showPickerFecha, setShowPickerFecha] = useState(false);
  const [showHoraInicio, setShowHoraInicio] = useState(false);
  const [showHoraFin, setShowHoraFin] = useState(false);
  const [tempFecha, setTempFecha] = useState('');
  const [tempHoraInicio, setTempHoraInicio] = useState('');
  const [tempHoraFin, setTempHoraFin] = useState('');

  const agregarFechaTrabajo = () => {
    if (!tempFecha || !tempHoraInicio || !tempHoraFin) {
      return Toast.show({ type: 'error', text1: 'Completa fecha y horas' });
    }
    setFechasTrabajo(prev => [...prev, { fecha: tempFecha, horaInicio: tempHoraInicio, horaFin: tempHoraFin }]);
    setTempFecha('');
    setTempHoraInicio('');
    setTempHoraFin('');
  };
  useEffect(() => {
    fetch('https://toolshop.cloud/Badger/controlador/backMovil/usuariosActivos.php')
      .then(res => res.json())
      .then(data => {
        const opciones = data.map(u => ({ label: u.nombre, value: u.id }));
        setDropdownUsuarios(opciones);
      });
  }, []);
  
  const terminarServicio = async () => {
    try {
      if (fechasTrabajo.some(f => !f.fecha || !f.horaInicio || !f.horaFin)) {
        return Toast.show({ type: 'error', text1: 'Completa las fechas trabajadas' });
      }
      
      const body = {
        idServicio,
        recomendaciones,
        conclusion,
        proximoMantenimiento,
        ayudantes: usuariosSeleccionados,
        fechasTrabajo,
      };
  
      const res = await fetch('https://toolshop.cloud/Badger/controlador/backMovil/terminarServicio.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  
      const data = await res.json();
      if (data.status === 'success') {
        Toast.show({ type: 'success', text1: 'Servicio terminado' });
        cerrarModal();
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message || 'No se pudo terminar' });
      }
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo conectar' });
    }
  };
  const cerrarModal = () => {
    setModalTerminar(false);
    setRecomendaciones('');
    setConclusion('');
    setProximoMantenimiento('');
    setUsuariosSeleccionados([]);
    setFechasTrabajo([]);
    setTempFecha('');
    setTempHoraInicio('');
    setTempHoraFin('');
  };
  useFocusEffect(
    React.useCallback(() => {
      const cargarDatos = async () => {
        try {
          const res = await fetch(`https://toolshop.cloud/Badger/controlador/backMovil/getDetalleServicio.php?idServicio=${idServicio}`);
          const data = await res.json();
  
          if (data.status === 'success') {
            setServicio(data.servicio);
            setFotos(data.fotos);
            setActividades(data.actividades || []);
            setDatosExtra(data.datosObjeto || []);
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'No se pudieron obtener los detalles.'
            });
          }
        } catch (error) {
          console.error('Error:', error);
          Toast.show({
            type: 'error',
            text1: 'Error de red',
            text2: 'No se pudo conectar con el servidor.'
          });
        }
        setCargando(false);
      };
  
      cargarDatos();
  
      // No necesitas devolver nada, a menos que quieras limpiar algo al salir de la pantalla
    }, [idServicio])
  );
  

  const renderFila = (label1, valor1, label2, valor2) => (
    <View style={styles.fila}>
      <View style={styles.campo}>
        <Text style={styles.label}>{label1}</Text>
        {valor1 ? (
          <RenderHTML
            contentWidth={Dimensions.get('window').width - 50}
            source={{ html: `<div>${parseWhatsAppFormat(valor1)}</div>` }}
            tagsStyles={{
              b: { fontWeight: 'bold' },
              i: { fontStyle: 'italic' },
              s: { textDecorationLine: 'line-through' },
              li: { marginLeft: 15, marginBottom: 4 },
              ul: { paddingLeft: 10 }
            }}
          />
        ) : (
          <Text style={styles.valor}>-</Text>
        )}
      </View>
      <View style={styles.campo}>
        <Text style={styles.label}>{label2}</Text>
        {valor2 ? (
          <RenderHTML
            contentWidth={Dimensions.get('window').width - 50}
            source={{ html: `<div>${parseWhatsAppFormat(valor2)}</div>` }}
            tagsStyles={{
              b: { fontWeight: 'bold' },
              i: { fontStyle: 'italic' },
              s: { textDecorationLine: 'line-through' },
              li: { marginLeft: 15, marginBottom: 4 },
              ul: { paddingLeft: 10 }
            }}
          />
        ) : (
          <Text style={styles.valor}>-</Text>
        )}
      </View>
    </View>
  );
  

  if (cargando) return <ActivityIndicator size="large" color="#205c98" style={{ marginTop: 50 }} />;
  if (!servicio) return <Text style={styles.centerText}>No se encontró el servicio</Text>;

  return (
    <ScrollView style={styles.container}>
       {servicio.Terminado !== "1" && (
  <TouchableOpacity style={styles.boton} onPress={() => setModalTerminar(true)}>
    <Text style={styles.botonTexto}>Terminar Servicio</Text>
  </TouchableOpacity>
)}


      <View style={styles.card}>
        {renderFila('Cliente', servicio.cliente, 'Ubicación', servicio.ubicacion)}
        {renderFila('Contacto', servicio.contactoNombre, 'Teléfono', servicio.contactoTelefono)}
        {renderFila('Folio', servicio.folio, 'Tipo Servicio', servicio.tipoServicio)}
        {renderFila('Estado Inicial', servicio.estadoInicial, 'Fecha Registro', servicio.fechaRegistro)}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>🗂️ Datos del Objeto</Text>

<View style={styles.objetoCard}>
  <Text style={styles.objetoNombre}>{servicio.objetoNombre}</Text>

  {servicio.objetoImg ? (
    <TouchableOpacity onPress={() => setImagenSeleccionada(`https://toolshop.cloud/Badger/badgertrack/Imagenes/${servicio.objetoImg}`)}>
      <Image source={{ uri: `https://toolshop.cloud/Badger/badgertrack/Imagenes/${servicio.objetoImg}` }} style={styles.imagenObjeto} />
    </TouchableOpacity>
  ) : (
    <Text style={styles.centerText}>Sin imagen disponible</Text>
  )}

  <Text style={styles.label}>📅 Fecha Instalación:</Text>
  <Text style={[styles.valor, { marginBottom: 10 }]}>{servicio.fecha_instalacion || '-'}</Text>

  {datosExtra.length > 0 && (
    <>
      <Text style={styles.label}>🔧 Datos Técnicos:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {datosExtra.map((d, idx) => (
          <View key={idx} style={{ width: '42%', marginBottom: 8, marginHorizontal: '4%' }}>
            <Text style={styles.valor}><Text style={{ fontWeight: 'bold' }}>{d.titulo}:</Text> {d.texto}</Text>
          </View>
        ))}
      </View>
    </>
  )}

  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
    {servicio.PDFManual && (
      <TouchableOpacity style={[styles.linkBoton, { flex: 1, marginRight: 5 }]} onPress={() => Linking.openURL(`https://toolshop.cloud/Badger/badgertrack/Manual/${servicio.PDFManual}`)}>
        <Text style={styles.linkTexto}>📄 Manual</Text>
      </TouchableOpacity>
    )}
    {servicio.PDFDiagramas && (
      <TouchableOpacity style={[styles.linkBoton, { flex: 1, marginLeft: 5 }]} onPress={() => Linking.openURL(`https://toolshop.cloud/Badger/badgertrack/Diagrama/${servicio.PDFDiagramas}`)}>
        <Text style={styles.linkTexto}>📊 Diagramas</Text>
      </TouchableOpacity>
    )}
  </View>

  {servicio.URLVideoMantenimiento && (
    <TouchableOpacity style={[styles.linkBoton, { marginTop: 8 }]} onPress={() => Linking.openURL(servicio.URLVideoMantenimiento)}>
      <Text style={styles.linkTexto}>🎥 Video de Mantenimiento</Text>
    </TouchableOpacity>
  )}
 </View>
     

        <Text style={styles.label}>Descripción del Servicio</Text>
        {servicio.descripcionServicio ? (
  <RenderHTML
    contentWidth={Dimensions.get('window').width - 50}
    source={{ html: `<div>${parseWhatsAppFormat(servicio.descripcionServicio)}</div>` }}
    tagsStyles={{
      b: { fontWeight: 'bold' },
      i: { fontStyle: 'italic' },
      s: { textDecorationLine: 'line-through' },
      li: { marginLeft: 15, marginBottom: 4 },
      ul: { paddingLeft: 10 }
    }}
  />
) : (
  <Text style={[styles.valor, { marginBottom: 10 }]}>-</Text>
)}


        <Text style={styles.sectionTitle}>📷 Evidencia del estado inicial</Text>
        {fotos.length === 0 ? (
          <Text style={styles.centerText}>Sin imágenes registradas</Text>
        ) : (
          <ScrollView horizontal style={{ marginTop: 10 }}>
            {fotos.map((url, index) => (
              <TouchableOpacity key={index} onPress={() => setImagenSeleccionada(url)}>
                <Image source={{ uri: url }} style={styles.thumb} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      


      </View>

      <TouchableOpacity
        style={styles.botonAgregar}
        onPress={() => navigation.navigate('NuevaActividad', { idServicio })}
      >
        <Text style={styles.botonTexto}>+ Agregar Actividad</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>🧾 Actividades realizadas</Text>
      <View style={{ flex: 1, marginBottom: 30 }}>
        {actividades.length === 0 ? (
          <Text style={styles.centerText}>No hay actividades registradas</Text>
        ) : (
          <FlatList
          data={actividades}
          keyExtractor={(item, index) => `actividad-${item.id || index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.actividadCard}
              onPress={() => navigation.navigate('DetalleActividad', { actividad: item })}
            >
              <RenderHTML
                contentWidth={Dimensions.get('window').width - 50}
                source={{ html: `<div>${parseWhatsAppFormat(item.descripcion)}</div>` }}
                tagsStyles={{
                  b: { fontWeight: 'bold' },
                  i: { fontStyle: 'italic' },
                  s: { textDecorationLine: 'line-through' },
                  li: { marginLeft: 15, marginBottom: 4 },
                  ul: { paddingLeft: 10 }
                }}
              />
            </TouchableOpacity>
          )}
        />
        
        
        
        
        )}
      </View>

      {/* Modal Imagen */}
      <Modal visible={!!imagenSeleccionada} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Image source={{ uri: imagenSeleccionada }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeButton} onPress={() => setImagenSeleccionada(null)}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal visible={modalTerminar} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>

      <Text style={styles.modalTitle}>✅ Terminar Servicio</Text>

      <Text style={styles.label}>📝 Recomendaciones (opcional)</Text>
      <TextInput
        style={styles.inputArea}
        multiline
        placeholder="Escribe recomendaciones..."
        placeholderTextColor="#000"
        value={recomendaciones}
        onChangeText={setRecomendaciones}
      />

      <Text style={styles.label}>🗒️ Conclusión (opcional)</Text>
      <TextInput
        style={styles.inputArea}
        multiline
        placeholder="Escribe la conclusión..."
        placeholderTextColor="#000"
        value={conclusion}
        onChangeText={setConclusion}
      />

      <Text style={styles.label}>📅 Próximo mantenimiento (opcional)</Text>
      <TouchableOpacity style={styles.inputClickable} onPress={() => setShowProximoMant(true)}>
        <Text style={{ color: proximoMantenimiento ? '#000' : '#888' }}>
          {proximoMantenimiento || 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>
      {showProximoMant && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowProximoMant(false);
            if (d) setProximoMantenimiento(d.toISOString().split('T')[0]);
          }}
        />
      )}

      <Text style={styles.label}>👥 Otros usuarios que ayudaron (opcional)</Text>
      <DropDownPicker
        multiple
        min={0}
        max={10}
        open={openUsuarios}
        value={usuariosSeleccionados}
        items={dropdownUsuarios}
        setOpen={setOpenUsuarios}
        setValue={setUsuariosSeleccionados}
        setItems={setDropdownUsuarios}
        placeholder="Selecciona usuarios"
        listMode="SCROLLVIEW"
        style={{ marginBottom: 10 }}
      />

      {usuariosSeleccionados.length > 0 && (
        <View style={styles.seleccionadosBox}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Usuarios seleccionados:</Text>
          {dropdownUsuarios.filter(u => usuariosSeleccionados.includes(u.value)).map(u => (
            <Text key={u.value} style={{ marginLeft: 8 }}>• {u.label}</Text>
          ))}
        </View>
      )}

      <Text style={styles.label}>🕑 Fechas trabajadas</Text>
      {fechasTrabajo.length === 0 && (
        <Text style={{ color: '#777', marginBottom: 8 }}>Aún no has agregado fechas</Text>
      )}
      {fechasTrabajo.map((f, idx) => (
        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text>• {f.fecha} | {f.horaInicio} - {f.horaFin}</Text>
          <TouchableOpacity onPress={() => setFechasTrabajo(fechasTrabajo.filter((_, i) => i !== idx))}>
            <Text style={{ color: 'red' }}>✖</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.botonSecundario} onPress={() => setShowPickerFecha(true)}>
        <Text style={styles.botonTexto}>➕ Agregar Fecha Trabajada</Text>
      </TouchableOpacity>

      {showPickerFecha && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowPickerFecha(false);
            if (d) setTempFecha(d.toISOString().split('T')[0]);
          }}
        />
      )}

      {tempFecha ? (
        <>
          <Text style={styles.label}>Hora inicio</Text>
          <TouchableOpacity style={styles.inputClickable} onPress={() => setShowHoraInicio(true)}>
            <Text>{tempHoraInicio || 'Seleccionar hora de inicio'}</Text>
          </TouchableOpacity>
          {showHoraInicio && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour
              display="default"
              onChange={(e, d) => {
                setShowHoraInicio(false);
                if (d) setTempHoraInicio(d.toTimeString().substring(0, 5));
              }}
            />
          )}

          <Text style={styles.label}>Hora fin</Text>
          <TouchableOpacity style={styles.inputClickable} onPress={() => setShowHoraFin(true)}>
            <Text>{tempHoraFin || 'Seleccionar hora de fin'}</Text>
          </TouchableOpacity>
          {showHoraFin && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour
              display="default"
              onChange={(e, d) => {
                setShowHoraFin(false);
                if (d) setTempHoraFin(d.toTimeString().substring(0, 5));
              }}
            />
          )}

          <TouchableOpacity style={styles.botonAgregar} onPress={agregarFechaTrabajo}>
            <Text style={styles.botonTexto}>Guardar fecha trabajada</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.botonesRow}>
      <TouchableOpacity style={[styles.botonSecundario, { flex: 1, marginRight: 5 }]} onPress={cerrarModal}>
  <Text style={styles.botonTexto}>Cancelar</Text>
</TouchableOpacity>

        <TouchableOpacity style={styles.boton} onPress={terminarServicio}>
          <Text style={styles.botonTexto}>Guardar</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#f4f6fc', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#205c98', marginBottom: 20 },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 18, fontWeight: 'bold', color: '#333' },
  centerText: { textAlign: 'center', color: '#777', marginTop: 20, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  campo: { width: '48%' },
  label: { fontWeight: '600', color: '#555' },
  valor: { fontSize: 16, color: '#222', marginTop: 2 },
  thumb: { width: 100, height: 100, marginRight: 10, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  imagenObjeto: { width: 200, height: 200, marginVertical: 10, alignSelf: 'center', borderRadius: 8 },
  link: { color: '#205c98', fontWeight: 'bold', marginTop: 5, marginBottom: 5 },
  modalOverlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '90%', height: '80%', marginBottom: 20 },
  closeButton: { backgroundColor: '#205c98', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  closeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonAgregar: { backgroundColor: '#205c98', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginVertical: 20, elevation: 3 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  actividadCard: { backgroundColor: '#fff', borderLeftColor: '#205c98', borderLeftWidth: 5, borderRadius: 6, padding: 12, marginBottom: 10 },
  actividadTitle: { fontWeight: 'bold', fontSize: 16, color: '#205c98', marginBottom: 4 },
  actividadTexto: { fontSize: 14, color: '#333' },
  objetoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom:10
  },
  
  objetoNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#205c98',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalContenido: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    elevation: 5,
  },
  
  
  imagenObjeto: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  
  linkBoton: {
    backgroundColor: '#205c98',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  boton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    alignSelf: 'flex-end', // Lo manda a la derecha
    marginVertical: 10,
    marginRight:10,
    width: 260, // Puedes ajustar el ancho a tu gusto
  },
  
  linkTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputArea: {
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    minHeight: 60,
    marginBottom: 12,
    color: '#000',
  },
  inputClickable: {
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
  },
  seleccionadosBox: {
    backgroundColor: '#e8f4ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 12,
  },
  botonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  botonSecundario: {
    backgroundColor: '#6c757d', // Gris elegante tipo Bootstrap
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  
});

export default DetalleServicioScreen;
