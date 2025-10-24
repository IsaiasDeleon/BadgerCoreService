// ViaticosScreen.js — OCR local con @react-native-ml-kit/text-recognition + Toast + refresh on focus
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, FlatList,
  Alert, ActivityIndicator, Platform, ScrollView, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const API_SAVE = 'https://toolshop.cloud/Badger/controlador/saveViatico.php';
const API_BASE = 'https://toolshop.cloud/Badger/controlador/viaticosData.php';
const CATEGORIAS = ['hospedaje', 'transporte', 'alimentos', 'materiales', 'otros'];
const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia'];

export default function ViaticosScreen({ navigation }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ---- Sesión ----
  const [user, setUser] = useState(null);
  const warnedRef = useRef(false);

  const getUserId = (u) =>
    u?.id ??
    u?.idUsuario ??
    u?.IdUsuario ??
    u?.ID ??
    u?.id_user ??
    null;

  const refreshSession = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('usuario');
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        warnedRef.current = false; // ya hay sesión, permite volver a avisar si se pierde
      } else {
        setUser(null);
        if (!warnedRef.current) {
          Toast.show({
            type: 'info',
            text1: 'Sesión requerida',
            text2: 'Inicia sesión para poder guardar tus viáticos.',
          });
          warnedRef.current = true;
        }
      }
    } catch (e) {
      console.warn('No pude leer la sesión', e);
    }
  }, []);

  // Cargar una vez al montar
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Recargar cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      refreshSession();
    }, [refreshSession])
  );

  // ---- Destino (Proyecto o Gasto) ----
  const [destino, setDestino] = useState(null); // { tipo: 'proyecto'|'gasto', id, label }
  const [opcionesDestino, setOpcionesDestino] = useState([]);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [filtroDestino, setFiltroDestino] = useState('');

  const [fechaViatico, setFechaViatico] = useState(today);
  const [categoria, setCategoria] = useState('alimentos');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [moneda, setMoneda] = useState('MXN');
  const [monto, setMonto] = useState('');
  const [iva, setIva] = useState('');

  const [files, setFiles] = useState([]); // [{uri,type,name,isImage,localAsset?}]
  const [loading, setLoading] = useState(false);

  // OCR / Sugerencias
  const [ocr, setOcr] = useState(null); // { subtotal, iva, total, moneda, fecha, proveedor, categoriaSugerida, notas }

  // Cargar proyectos y gastos
  useEffect(() => {
    (async () => {
      try {
        const fd = new FormData();
        fd.append('action', 'ListProyectosYGastosActivos');
        const res = await fetch(API_BASE, { method: 'POST', body: fd });
        const json = await res.json();
        if (!json || !json.success) throw new Error(json?.msg || 'No se pudo obtener el listado');

        const proyectos = (json.proyectos || []).map(p => ({
          key: `PROY-${p.id}`,
          tipo: 'proyecto',
          id: String(p.id),
          label: `[PROY] ${p.nombre || p.Nombre || `Proyecto ${p.id}`}`,
        }));
        const gastos = (json.gastos || []).map(g => ({
          key: `GASTO-${g.id}`,
          tipo: 'gasto',
          id: String(g.id),
          label: `[GASTO] ${g.nombre || g.Nombre || `Gasto ${g.id}`}`,
        }));
        setOpcionesDestino([...proyectos, ...gastos]);
      } catch (e) {
        console.warn(e);
        setOpcionesDestino([]);
      }
    })();
  }, []);
  const resetForm = (keepDestino = true) => {
    setOcr(null);
    setFiles([]);
    setMonto('');
    setIva('');
    setMoneda('MXN');
    setFechaViatico(today);
    setCategoria('alimentos');
    if (!keepDestino) setDestino(null); // por si también quieres limpiar el destino
  };
  const filteredOpciones = opcionesDestino.filter(o =>
    o.label.toLowerCase().includes(filtroDestino.trim().toLowerCase())
  );

  // ---------- OCR helpers ----------
  const normalizeNumber = (s) => {
    if (!s) return null;
    let t = String(s).replace(/[^\d.,\-]/g, '').replace(/\s+/g, '').trim();
    const manyDots = (t.match(/\./g) || []).length;
    const manyCommas = (t.match(/,/g) || []).length;
    if (manyDots > 1 && t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (manyCommas > 1 && t.includes('.')) t = t.replace(/,/g, '');
    else if (!t.includes('.') && t.includes(',')) t = t.replace(',', '.');
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const extractLastNumber = (str) => {
    const matches = [...String(str||'').matchAll(/-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|-?\d+(?:[.,]\d{2})/g)];
    return matches.length ? normalizeNumber(matches[matches.length - 1][0]) : null;
  };
  const detectMoneda = (text) => {
    const T = String(text).toUpperCase();
    if (/\bUSD\b|US\$|\$USD/.test(T)) return 'USD';
    if (/\bEUR\b|€/.test(T)) return 'EUR';
    if (/\bMXN\b|\bM\.N\.\b|\$/.test(T)) return 'MXN';
    return 'MXN';
  };
  const detectFecha = (text) => {
    const s = String(text);
    let m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (m) { const [, y, mo, d] = m; return `${y.padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    m = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m) { let [, d, mo, y] = m; if (String(y).length === 2) y = `20${y}`; return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    return null;
  };
  const guessCategoria = (fullTextUpper) => {
    const T = fullTextUpper;
    const hasAny = (arr) => arr.some(w => T.includes(w));
    if (hasAny(['HOTEL','HOSPEDA','MOTEL','HOSTAL','AIRBNB','ALOJ'])) return 'hospedaje';
    if (hasAny(['UBER','DIDI','TAXI','PEAJE','CASETA','GASOL','COMBUST','BUS','CAMION','AVION','VUELO','AEROL'])) return 'transporte';
    if (hasAny(['RESTAUR','CAFETER','FOOD','COMIDA','ALIMENT','CAFÉ','CAFE','BURGER','TACOS','PIZZA','SUPERMERC'])) return 'alimentos';
    if (hasAny(['FERRETER','HERRAM','MATERIAL','REFACC','ELECTRIC','TORNILL','HOME DEPOT','LOWE','ACE'])) return 'materiales';
    return 'otros';
  };
  const findNearbyValue = (lines, idx, lookAhead = 2) => {
    let n = extractLastNumber(lines[idx]);
    if (n != null) return n;
    for (let k = 1; k <= lookAhead; k++) {
      const j = idx + k;
      if (j < lines.length) {
        const candidate = extractLastNumber(lines[j]);
        if (candidate != null) return candidate;
      }
    }
    return null;
  };
  const parseOCRText = (fullText = '') => {
    const lines = fullText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const T = fullText.replace(/\s+/g, ' ').toUpperCase();
    const U = lines.map(l => l.toUpperCase());
    let moneda = detectMoneda(fullText);
    let fecha  = detectFecha(fullText);
    const labelFind = (keys) => {
      for (let i=0;i<U.length;i++){
        if (keys.some(k => U[i].includes(k))) {
          const n = findNearbyValue(lines, i, 2);
          if (n != null) return n;
        }
      }
      return null;
    };
    let subtotal = labelFind(['SUBTOTAL', 'SUB-TOTAL', 'STOTAL']);
    let total    = labelFind(['TOTAL A PAGAR','TOTAL A COBRAR','TOTAL:', 'TOTAL ', 'IMPORTE TOTAL', 'TOTAL']);
    let iva      = null;
    for (let i=0;i<U.length && iva==null;i++){
      if (/(^|\s)(IVA|VAT|IMPUESTO|IMPTO)(\s|:|$)/.test(U[i])) {
        const v = findNearbyValue(lines, i, 2);
        if (v != null) { iva = v; break; }
      }
    }
    if (iva == null){
      for (let i=0;i<U.length;i++){
        if (/(IVA|VAT).{0,8}(\d{1,2})\s?%/.test(U[i]) || /\b(10|11|12|13|14|15|16|17|18)\s?%/.test(U[i])) {
          const v = findNearbyValue(lines, i, 2);
          if (v != null) { iva = v; break; }
        }
      }
    }
    const notes = [];
    if (total == null) {
      const allNums = [...fullText.matchAll(/-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|-?\d+(?:[.,]\d{2})/g)]
        .map(m => normalizeNumber(m[0])).filter(n => n != null);
      if (allNums.length) { total = Math.max(...allNums); notes.push('Total estimado por máximo detectado.'); }
    }
    if (subtotal != null && iva == null && /(IVA|VAT|IMPUEST|16%)/.test(T)) {
      const pctMatch = T.match(/(10|11|12|13|14|15|16|17|18)\s?%/);
      const pct = pctMatch ? (Number(pctMatch[1])/100) : 0.16;
      iva = +(subtotal * pct).toFixed(2);
      notes.push(`IVA estimado por porcentaje (${Math.round((pct)*100)}%).`);
    }
    if (subtotal != null && iva != null && total == null) {
      total = +(subtotal + iva).toFixed(2);
      notes.push('Total calculado como subtotal + IVA.');
    }
    if (total != null && subtotal != null && total < subtotal) {
      notes.push('Advertencia: TOTAL < SUBTOTAL (posible OCR/retención/propina).');
    }
    let proveedor = null;
    for (const ln of lines) {
      if (ln.length > 3 && !/\d{3,}/.test(ln) &&
          !/(TOTAL|SUBTOTAL|TICKET|FACTURA|FOLIO|FECHA|HORA|IVA|IMPUESTO|RFC|R\.F\.C)/i.test(ln)) {
        proveedor = ln.trim(); break;
      }
    }
    const categoriaSugerida = guessCategoria(T);
    return { subtotal, iva, total, moneda, fecha, proveedor, categoriaSugerida, notas: notes };
  };

  // 🛡️ Asegura que ML Kit reciba SIEMPRE un URI con esquema válido
  const prepareOcrSourceUri = async (uri) => {
    if (!uri) return null;
    if (uri.startsWith('content://')) return uri;
    if (uri.startsWith('file://')) return uri;
    if (uri.startsWith('/')) return `file://${uri}`;
    const dest = `${RNFS.CachesDirectoryPath}/ocr_${Date.now()}.jpg`;
    try {
      await RNFS.copyFile(uri, dest);
      return `file://${dest}`;
    } catch (e) {
      console.warn('No se pudo preparar URI para ML Kit', e);
      return null;
    }
  };

  const runOCROnImage = async (uri) => {
    try {
      const mlkitUri = await prepareOcrSourceUri(uri);
      if (!mlkitUri) return null;
      const result = await TextRecognition.recognize(mlkitUri);
      const fullText = result?.text || '';
      if (!fullText) return null;
      return parseOCRText(fullText);
    } catch (e) {
      if (String(e?.message || e).includes('No content provider') && uri?.startsWith('/')) {
        try {
          const retry = await TextRecognition.recognize(`file://${uri}`);
          const full = retry?.text || '';
          return full ? parseOCRText(full) : null;
        } catch (e2) {
          console.warn('OCR retry fallo:', e2?.message || e2);
        }
      }
      console.warn('OCR fallo:', e?.message || e);
      return null;
    }
  };

// util: normaliza fecha a YYYY-MM-DD y quita caracteres invisibles
const cleanDate = (s) => {
  if (!s) return null;
  const x = String(s).replace(/\s+/g, ' ').trim(); // quita \n, \r, dobles espacios
  // ya viene como YYYY-MM-DD en tu detector, pero revalidamos:
  const m1 = x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = x.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m2) {
    let [, d, mo, y] = m2;
    if (String(y).length === 2) y = `20${y}`;
    return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return x; // última instancia: lo que venga
};

// Aplica sugerencias OCR — robusto vs cierres viejos y espacios invisibles
const applyOCR = (maybeData) => {
  // usa SIEMPRE la última del estado si no te pasaron una válida
  const data = (maybeData && typeof maybeData === 'object') ? maybeData : ocr;
  if (!data) return;

  // monto -> total/subtotal
  const nuevoMonto = (data.total != null)
    ? String(data.total)
    : (data.subtotal != null ? String(data.subtotal) : '');

  setMonto(nuevoMonto);
  setMoneda(data.moneda || 'MXN');

  // fecha: sanitizada y en setState funcional
  const fx = cleanDate(data.fecha);
  console.log(fx)
  if (fx) {
    setFechaViatico(() => fx);
  }

  // IVA: si no hay, vacía
  setIva(data.iva != null ? String(data.iva) : '');

  if (data.categoriaSugerida) setCategoria(data.categoriaSugerida);

  // pequeño log para confirmar
  console.log('applyOCR -> fecha aplicada:', fx);

  Toast.show({ type: 'success', text1: 'Sugerencias aplicadas' });
};


const normalizeUploadUri = async (uri) => {
  if (!uri) return null;
  if (uri.startsWith('content://') || uri.startsWith('file://')) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  // copia a caché si te llega algo raro
  const dest = `${RNFS.CachesDirectoryPath}/up_${Date.now()}.jpg`;
  try {
    await RNFS.copyFile(uri, dest);
    return `file://${dest}`;
  } catch {
    return uri;
  }
};

  // Corre OCR para nuevas imágenes
  const runOCRForNewImages = async (assets) => {
    for (const a of assets) {
      const o = await runOCROnImage(a.uri);
      if (o) {
        // if (o.total != null) setMonto(prev => prev || String(o.total));
        // else if (o.subtotal != null) setMonto(prev => prev || String(o.subtotal));
        // if (o.moneda && !moneda) setMoneda(o.moneda);
        // if (o.fecha && (!fechaViatico || fechaViatico === today)) setFechaViatico(o.fecha);
        // if (o.iva != null && !iva) setIva(String(o.iva));
        setOcr(o);
      }
    }
  };

  // ---------- Pickers (solo imágenes) ----------
  const onPickFromGallery = async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo', quality: 0.9, selectionLimit: 0, includeBase64: false, saveToPhotos: false,
    });
    if (res.didCancel) return;
    const assets = (res.assets || [])
      .map(a => ({ uri: a.uri || '', type: a.type || 'image/jpeg', name: a.fileName || `photo_${Date.now()}.jpg`, isImage: true, localAsset: a }))
      .filter(x => !!x.uri);
    if (!assets.length) return;
    setFiles(prev => [...prev, ...assets]);
    await runOCRForNewImages(assets);
    Toast.show({ type: 'info', text1: 'Imágenes agregadas', text2: 'Analizando con OCR…' });
  };

  const onTakePhoto = async () => {
    const res = await launchCamera({
      mediaType: 'photo', quality: 0.9, includeBase64: false, saveToPhotos: false,
    });
    if (res.didCancel) return;
    const assets = (res.assets || [])
      .map(a => ({ uri: a.uri || '', type: a.type || 'image/jpeg', name: a.fileName || `camera_${Date.now()}.jpg`, isImage: true, localAsset: a }))
      .filter(x => !!x.uri);
    if (!assets.length) return;
    setFiles(prev => [...prev, ...assets]);
    await runOCRForNewImages(assets);
    Toast.show({ type: 'info', text1: 'Foto agregada', text2: 'Analizando con OCR…' });
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    Toast.show({ type: 'info', text1: 'Archivo eliminado' });
  };

  // ---------- Validaciones y guardado ----------
  const validateForm = () => {
    if (!destino?.id || !destino?.tipo) return 'Selecciona un proyecto o gasto.';
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) return 'Captura un monto válido (> 0).';
    if (!metodoPago) return 'Selecciona el método de pago.';
    if (!categoria) return 'Selecciona la categoría.';
    if (!fechaViatico) return 'Captura la fecha del viático.';
    return null;
  };

  const handleSave = async () => {
    const uid = getUserId(user);
    if (!uid) {
      Toast.show({ type: 'error', text1: 'Inicia sesión', text2: 'Debes iniciar sesión para registrar un viático.' });
      return;
    }
  
    const err = validateForm();
    if (err) {
      Toast.show({ type: 'error', text1: 'Faltan datos', text2: err });
      return;
    }
  
    // Debe existir al menos una imagen (el endpoint nuevo admite UN archivo en "imagen")
    if (!files.length) {
      Toast.show({ type: 'error', text1: 'Comprobante requerido', text2: 'Agrega una foto del ticket o factura.' });
      return;
    }
  
    // Si es GASTO, mantenemos tu flujo actual (API_BASE con acciones) para no romper nada
    if (destino?.tipo === 'gasto') {
      try {
        setLoading(true);
        // 1) Crear viático con el flujo viejo
        const fd = new FormData();
        fd.append('action', 'CreateViaticoData');
        fd.append('idUsuario', String(uid));
        fd.append('idGasto', destino.id);
        fd.append('fechaViatico', fechaViatico);
        fd.append('categoria', categoria);
        fd.append('metodoPago', metodoPago);
        fd.append('moneda', moneda);
        fd.append('monto', monto);
        if (iva) fd.append('iva', iva);
  
        const res = await fetch(API_BASE, { method: 'POST', body: fd });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.msg || 'Error al guardar el viático');
  
        const idViatico = json.idViatico;
  
        // 2) Subir todas las imágenes
        for (const f of files) {
          const normUri = await normalizeUploadUri(f.uri);
          const up = new FormData();
          up.append('action', 'UploadArchivoViaticoData');
          up.append('idViatico', String(idViatico));
          up.append('file', { uri: normUri, type: f.type || 'image/jpeg', name: f.name || `file_${Date.now()}.jpg` });
          const r = await fetch(API_BASE, { method: 'POST', body: up });
          const j = await r.json();
          if (!j?.success) console.warn('Fallo al subir archivo (gasto):', j?.msg);
        }
  
        Toast.show({ type: 'success', text1: 'Listo', text2: 'Viático (gasto) guardado.' });
        setMonto(''); setIva(''); setFiles([]);
      } catch (e) {
        console.error(e);
        Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'No se pudo guardar' });
      } finally {
        setLoading(false);
      }
      return;
    }
  
    // === PROYECTO → usar el endpoint nuevo que guarda y envía correo ===
    try {
      setLoading(true);
  
      const f0 = files[0]; // el endpoint nuevo acepta UN archivo
      const normUri = await normalizeUploadUri(f0.uri);
      const one = new FormData();
      one.append('monto', String(monto));
      one.append('proyecto', String(destino.id));       // nombre exacto que espera el PHP
      one.append('metodo_pago', metodoPago);            // nombre exacto
      one.append('Fecha', fechaViatico);                // OJO: "Fecha" con F mayúscula
      one.append('moneda', moneda);
      one.append('categoria', categoria);
      one.append('idUser', String(uid));
      if (iva) one.append('iva', String(iva));
      one.append('imagen', {
        uri: normUri,
        type: f0.type || (f0.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        name: f0.name || `comprobante_${Date.now()}.jpg`,
      });
  
      const res = await fetch(API_SAVE, { method: 'POST', body: one });
      const json = await res.json();
      if (!json?.success) {
        // Mensaje del server cuando algo de validación falla
        throw new Error(json?.message || 'No se pudo guardar el viático');
      }
  
      // Opcional: si el usuario cargó varias fotos, avísale que se guardó solo la primera
      if (files.length > 1) {
        Toast.show({ type: 'info', text1: 'Nota', text2: 'Se adjuntó solo la primera imagen. (Podemos habilitar múltiples más adelante)' });
      }
  
      Toast.show({ type: 'success', text1: 'Listo', text2: 'Viático guardado y correo enviado.' });
      setMonto(''); setIva(''); setFiles([]);
      resetForm(); 
      // Si quieres, podrías navegar o refrescar listas aquí
      // navigation?.goBack?.();
    } catch (e) {
      console.error('saveViatico error:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'No se pudo guardar' });
    } finally {
      setLoading(false);
    }
  };
  

  const FileCard = ({ item, index }) => (
    <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600' }}>{item.name}</Text>
        <TouchableOpacity onPress={() => removeFile(index)}>
          <Text style={{ color: '#d11' }}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      {item.isImage ? (
        <Image source={{ uri: item.uri }} style={{ width: '100%', height: 160, marginTop: 8, borderRadius: 8 }} resizeMode="cover" />
      ) : (
        <Text style={{ marginTop: 8, color: '#555' }}>Archivo adjunto</Text>
      )}
    </View>
  );

  // Deja el botón habilitado aunque no haya usuario; el guardado validará sesión y mostrará toast
  const canSave = !!destino?.id && !loading;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Nuevo Viático</Text>

      {!user && (
        <View style={{ backgroundColor: '#FFF4CE', borderColor: '#F5D28C', borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 10 }}>
          <Text style={{ color: '#7a591a', marginBottom: 8 }}>
            Debes iniciar sesión para poder guardar tus viáticos.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (navigation?.navigate) navigation.navigate('Perfil');
              else Alert.alert('Iniciar sesión', 'Ve a la sección Perfil e inicia sesión.');
            }}
            style={{ backgroundColor: '#7a591a', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Ir a iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={refreshSession}
            style={{ borderColor: '#7a591a', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: '#7a591a', fontWeight: '700' }}>Ya inicié sesión → refrescar</Text>
          </TouchableOpacity>
        </View>
      )}

      {user && (
        <Text style={{ color: '#555', marginBottom: 8 }}>
          Registrando como <Text style={{ fontWeight: '700' }}>{user.nombre || user.usuario}</Text>
        </Text>
      )}

      {/* Selector: Proyecto / Gasto (OBLIGATORIO) */}
      <Text style={{ fontWeight: '600', marginBottom: 4 }}>Proyecto / Gasto</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDestinoModal(true)}>
        <Text style={{ color: destino ? '#000' : '#888' }}>
          {destino ? destino.label : 'Seleccionar proyecto o gasto'}
        </Text>
      </TouchableOpacity>
      {!destino && <Text style={{ color: '#b00', marginTop: -4, marginBottom: 6 }}>Obligatorio</Text>}

      {/* 📎 Comprobantes (solo imágenes) */}
      <Text style={{ fontWeight: '700', marginTop: 8, marginBottom: 6 }}>Comprobantes</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={onTakePhoto} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPickFromGallery} style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Subir imagen</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={files}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => <FileCard item={item} index={index} />}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Aún no hay comprobantes.</Text>}
        scrollEnabled={false}
        style={{ marginBottom: 8 }}
      />
      <Text style={{ color: '#666', marginBottom: 12 }}>
        La foto debe ser legible (sin blur, buena iluminación y ticket plano).
      </Text>

      {/* Sugerencias OCR */}
      {ocr && (
        <View style={{ borderWidth: 1, borderColor: '#cfe', backgroundColor: '#f6fffb', padding: 12, borderRadius: 10, marginBottom: 10 }}>
          <Text style={{ fontWeight: '700', color: '#067' }}>Sugerencias OCR</Text>
          <Text>Total: {ocr.total ?? '-'}</Text>
          <Text>Subtotal: {ocr.subtotal ?? '-'}</Text>
          <Text>IVA: {ocr.iva ?? '-'}</Text>
          <Text>Moneda: {ocr.moneda ?? '-'}</Text>
          <Text>Fecha: {ocr.fecha ?? '-'}</Text>
          <Text>Proveedor: {ocr.proveedor ?? '-'}</Text>
          <Text>Categoría sugerida: {ocr.categoriaSugerida ?? '-'}</Text>
          {ocr.notas?.length ? (
            <View style={{ marginTop: 6 }}>
              {ocr.notas.map((n, i) => <Text key={i} style={{ color: '#067' }}>• {n}</Text>)}
            </View>
          ) : null}
          <TouchableOpacity onPress={() => applyOCR(ocr)} style={[styles.btnPrimary, { marginTop: 8, alignSelf: 'flex-start' }]}>
            <Text style={styles.btnPrimaryText}>Aplicar sugerencias</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fecha */}
      <Text style={{ fontWeight: '600', marginBottom: 4, marginTop: 6 }}>Fecha del viático</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          placeholder="YYYY-MM-DD"
          value={fechaViatico}
          onChangeText={setFechaViatico}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity onPress={() => setFechaViatico(today)} style={styles.btnGhost}>
          <Text style={{ fontWeight: '600' }}>Hoy</Text>
        </TouchableOpacity>
      </View>

      {/* Categoría */}
      <Text style={{ fontWeight: '600', marginBottom: 4, marginTop: 6 }}>Categoría</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORIAS.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setCategoria(cat)} style={[styles.chip, categoria === cat && styles.chipActive]}>
            <Text style={{ color: categoria === cat ? '#fff' : '#333' }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Método de pago */}
      <Text style={{ fontWeight: '600', marginBottom: 4, marginTop: 10 }}>Método de pago</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {METODOS.map(m => (
          <TouchableOpacity key={m} onPress={() => setMetodoPago(m)} style={[styles.chipOutline, metodoPago === m && styles.chipOutlineActive]}>
            <Text style={{ color: metodoPago === m ? '#0a7' : '#333' }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Moneda y Monto */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>Moneda</Text>
          <TextInput
            placeholder="MXN"
            value={moneda}
            onChangeText={setMoneda}
            autoCapitalize="characters"
            style={styles.input}
            maxLength={3}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>Monto</Text>
          <TextInput
            placeholder="0.00"
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </View>

      {/* IVA opcional */}
      <Text style={{ fontWeight: '600', marginBottom: 4, marginTop: 6 }}>IVA (opcional)</Text>
      <TextInput
        placeholder="0.00"
        value={iva}
        onChangeText={setIva}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleSave}
        style={[styles.btnSave, { opacity: canSave ? 1 : 0.6 }]}
        disabled={!canSave}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Guardar</Text>}
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      {/* Modal selector Proyecto/Gasto */}
      <Modal visible={showDestinoModal} animationType="slide" onRequestClose={() => setShowDestinoModal(false)}>
        <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Selecciona Proyecto o Gasto</Text>
          <TextInput placeholder="Buscar..." value={filtroDestino} onChangeText={setFiltroDestino} style={styles.input} />
          <FlatList
            data={filteredOpciones}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { setDestino(item); setShowDestinoModal(false); }}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: '#666', marginTop: 10 }}>Sin resultados.</Text>}
          />
          <TouchableOpacity onPress={() => setShowDestinoModal(false)} style={[styles.btnGhost, { marginTop: 12 }]}>
            <Text style={{ fontWeight: '700' }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8 }),
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f0f0f0',
  },
  chipActive: {
    backgroundColor: '#0077cc',
  },
  chipOutline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#fff',
  },
  chipOutlineActive: {
    borderColor: '#0a7',
  },
  btnPrimary: {
    backgroundColor: '#0a7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  btnSave: {
    backgroundColor: '#0077cc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
};
