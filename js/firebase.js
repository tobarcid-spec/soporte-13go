// ============================================================
// MÓDULO FIREBASE — Autenticación y sincronización Firestore
// ============================================================
// Firebase Authentication: login con Google, acceso restringido
// únicamente a soporte13go@13.cl.
// Firestore: almacén central de datos (tickets, bugs, conocimiento,
// config). localStorage actúa como caché local de lectura rápida.
//
// REGLAS DE SEGURIDAD — pegar en Firebase Console → Firestore → Reglas:
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /{document=**} {
//         allow read, write: if request.auth != null
//           && request.auth.token.email == "soporte13go@13.cl";
//       }
//     }
//   }
//
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD-LIGoJZIOvz1J0lfXWUWK8zbgMIFBr3s',
  authDomain:        'soporte-13go.firebaseapp.com',
  projectId:         'soporte-13go',
  storageBucket:     'soporte-13go.firebasestorage.app',
  messagingSenderId: '245633139950',
  appId:             '1:245633139950:web:e1a57d5a98a2862349dfff'
};

const EMAILS_AUTORIZADOS = ['soporte13go@13.cl', 'tobarcid@gmail.com'];
const CLAVES_FIRESTORE   = ['tickets', 'bugs_log', 'knowledge_base', 'config'];

let _db            = null;
let _auth          = null;
let _usuarioActual = null;
const _timersFS    = {};

// ============================================================
// INICIALIZACIÓN
// ============================================================

function inicializarFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('[Firebase] SDK no disponible — la app funciona en modo local');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  _db   = firebase.firestore();
  _auth = firebase.auth();

  // Listener principal: dispara al iniciar (sesión guardada o no), login y logout.
  // La primera llamada resuelve si hay sesión guardada — reemplaza al spinner.
  _auth.onAuthStateChanged(async (usuario) => {
    if (typeof ocultarSpinner === 'function') ocultarSpinner();

    if (usuario) {
      if (!EMAILS_AUTORIZADOS.includes(usuario.email)) {
        await _auth.signOut();
        mostrarToast('Acceso no autorizado: ' + usuario.email, 'error');
        return;
      }
      _usuarioActual = usuario;
      await descargarDatosDesdeFirestore();
      if (typeof onFirebaseConectado === 'function') onFirebaseConectado(usuario.email);
    } else {
      // No hay sesión — mostrar pantalla de login
      _usuarioActual = null;
      if (typeof onFirebaseDesconectado === 'function') onFirebaseDesconectado();
    }
  });
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

async function loginConGoogle() {
  if (!_auth) { mostrarToast('Firebase no inicializado', 'error'); return; }
  const proveedor = new firebase.auth.GoogleAuthProvider();
  proveedor.setCustomParameters({ login_hint: EMAILS_AUTORIZADOS[0] });
  try {
    await _auth.signInWithPopup(proveedor);
    // onAuthStateChanged maneja el resto
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      mostrarToast('Error al iniciar sesión: ' + err.message, 'error');
    }
  }
}

async function logoutFirebase() {
  if (!_auth) return;
  await _auth.signOut();
  mostrarToast('Sesión cerrada', 'aviso');
}

function firebaseConectado() {
  return !!_usuarioActual;
}

function obtenerEmailFirebase() {
  return _usuarioActual ? _usuarioActual.email : '';
}

// ============================================================
// PULL — Descargar todos los datos desde Firestore a localStorage
// ============================================================

async function descargarDatosDesdeFirestore() {
  if (!_db || !_usuarioActual) return;
  mostrarSpinner('Sincronizando datos...');
  try {
    for (const clave of CLAVES_FIRESTORE) {
      const doc = await _db.collection('datos').doc(clave).get();
      if (!doc.exists) continue;
      const datos = doc.data();
      // Escribir directo a localStorage para no disparar otro push en cadena
      if (clave === 'config') {
        localStorage.setItem('config', JSON.stringify(datos.valor ?? {}));
      } else {
        localStorage.setItem(clave, JSON.stringify(datos.registros ?? []));
      }
    }
    console.log('[Firebase] Datos descargados desde Firestore');
  } catch (err) {
    console.error('[Firebase] Error descargando datos:', err);
    mostrarToast('Error al sincronizar. Usando datos locales.', 'aviso');
  } finally {
    ocultarSpinner();
  }
}

// ============================================================
// PUSH — Subir una clave a Firestore (debounce 800 ms)
// ============================================================

function programarSubidaFirestore(clave) {
  clearTimeout(_timersFS[clave]);
  _timersFS[clave] = setTimeout(() => _subirClave(clave), 800);
}

async function _subirClave(clave) {
  if (!_db || !_usuarioActual) return;
  const valor = leerLS(clave, clave === 'config' ? {} : []);
  try {
    const payload = clave === 'config'
      ? { valor }
      : { registros: Array.isArray(valor) ? valor : [] };
    await _db.collection('datos').doc(clave).set(payload);
    console.log('[Firebase] Guardado:', clave);
  } catch (err) {
    console.error('[Firebase] Error guardando ' + clave + ':', err);
  }
}

// ============================================================
// SINCRONIZACIÓN FORZADA
// ============================================================

async function forzarSyncFirestore() {
  if (!firebaseConectado()) {
    mostrarToast('Inicia sesión para sincronizar', 'aviso');
    return;
  }
  mostrarSpinner('Sincronizando con Firebase...');
  await descargarDatosDesdeFirestore();
  if (typeof renderizarTablaTickets === 'function')    renderizarTablaTickets();
  if (typeof renderizarModuloBugs === 'function')      renderizarModuloBugs();
  if (typeof renderizarListaConocimiento === 'function') renderizarListaConocimiento();
  if (typeof actualizarBadgesSidebar === 'function')   actualizarBadgesSidebar();
  if (typeof renderizarConfiguracion === 'function')   renderizarConfiguracion();
  ocultarSpinner();
  mostrarToast('Sincronización completada', 'exito');
}
