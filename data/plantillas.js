// ============================================================
// PLANTILLAS DE RESPUESTA — SOPORTE 13GO
// Editar desde la app en: Módulo "Base de conocimiento"
// ============================================================

const PLANTILLAS = {

  // ============================================================
  // CATEGORÍA: DAR DE BAJA
  // Etiqueta Gmail: "Dar de baja"
  // ============================================================

  // PROBLEMA: Usuario quiere cancelar / terminar su suscripción
  cancelar_suscripcion: {
    categoria: 'dar_de_baja',
    etiqueta_gmail: 'Dar de baja',
    titulo: 'Cancelación de suscripción',
    texto: `Hola, (Nombre):

Gracias por escribirnos. Si deseas cancelar tu suscripción, el proceso es muy sencillo:

- Ingresa desde tu navegador a 13go.cl/user (asegúrate de tener tu sesión iniciada).
- Haz clic en la opción "Finalizar suscripción".
- Al confirmar, los cobros futuros se suspenderán automáticamente.

¡Pero antes de que te vayas, tenemos un beneficio para ti!

Nos encantaría que sigas con nosotros. ¿Podrías contarnos brevemente por qué decidiste cancelar? Tu opinión nos ayuda a mejorar. Solo por respondernos, te ofrecemos una oferta especial:

- 4 meses por el precio de 2 (50% de descuento).

Nota importante: Si decides aprovechar el descuento, por favor no des de baja tu cuenta aún. Responde a este correo indicando el motivo y que deseas la oferta, y nosotros configuraremos todo.

Cualquier duda, estamos aquí para ayudarte.

¡Que tengas un excelente día!
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: CLAVE Y ACCESO
  // Etiqueta Gmail: "Clave y acceso"
  // ============================================================

  // PROBLEMA: Usuario olvidó su contraseña
  olvido_contrasena: {
    categoria: 'clave_y_acceso',
    etiqueta_gmail: 'Clave y acceso',
    titulo: 'Recuperación de contraseña',
    texto: `Hola (Nombre), gracias por contactarnos.

En caso de que no recuerdes tu contraseña, solo debes ingresar a través de tu navegador a idp.13.cl/ y seleccionar la opción "Olvidé mi contraseña".

Al seleccionar esa opción, ingresa tu correo y sigue los pasos que llegarán al mismo.

Quedamos atentos a tus comentarios y a cualquier duda.

Saludos, que tengas un excelente día.`
  },

  // PROBLEMA: Usuario quiere cambiar su correo electrónico
  cambio_correo: {
    categoria: 'clave_y_acceso',
    etiqueta_gmail: 'Clave y acceso',
    titulo: 'Cambio de correo electrónico',
    texto: `Hola (Nombre), gracias por contactarnos.

Solo debes ingresar a través de tu navegador a 13go.cl/user y seleccionar la opción "Cambiar Email".

Al seleccionar esa opción, sigue los pasos que se te indiquen y podrás realizar el cambio de correo.

Quedamos atentos a tus comentarios y a cualquier duda que tengas.

Saludos, que tengas un excelente día.`
  },

  // ============================================================
  // CATEGORÍA: CONTENIDOS
  // Etiqueta Gmail: "Contenidos"
  // ============================================================

  // PROBLEMA: Smart TV LG / Roku / Samsung sin actualización disponible
  smart_tv_sin_actualizacion: {
    categoria: 'contenidos',
    etiqueta_gmail: 'Contenidos',
    titulo: 'Smart TV sin actualización de app (LG, Roku, Samsung)',
    texto: `Hola (Nombre), gracias por contactarnos.

Los Smart TV LG y Roku, la actualización aún está en proceso de aprobación por parte de sus respectivas tiendas de aplicaciones, por lo que si tienes un televisor de una de esas marcas es probable que estés experimentando algún problema.

Lamentablemente, estos procesos pueden tomar un poco más de tiempo, ya que dependen de los tiempos de revisión de cada plataforma, los cuales están fuera de nuestro control.

Estamos haciendo todo lo posible para que esté disponible pronto y, apenas se publique, te avisaremos por este medio.

Si utilizas un televisor Samsung, te recomendamos revisar las últimas actualizaciones de la aplicación 13Go.

Quedamos atentos a tus comentarios.

Saludos.`
  },

  // PROBLEMA: Necesitamos más antecedentes para diagnosticar error de contenido
  pedir_antecedentes_contenido: {
    categoria: 'contenidos',
    etiqueta_gmail: 'Contenidos',
    titulo: 'Solicitar captura de error de contenido',
    texto: `Hola,

Muchas gracias por contactarnos. Lamentamos los inconvenientes que estás experimentando.

Para poder revisar tu caso, necesitamos conocer un poco más sobre lo que ocurre. ¿Podrías enviarnos una captura de pantalla del error o del mensaje que aparece?

Además, si pudieras indicarnos el nombre del contenido afectado, el modelo de tu dispositivo o desde qué plataforma estás accediendo, nos sería de gran ayuda para agilizar el diagnóstico.

Quedamos atentos a tus comentarios para poder ayudarte lo antes posible.

Saludos cordiales,
Soporte 13GO`
  },

  // ============================================================
  // CATEGORÍA: GIFT CARD
  // Etiqueta Gmail: "Gift card"
  // ============================================================

  // PROBLEMA: Usuario no encuentra o no recibió su giftcard en el correo
  giftcard_no_encontrada: {
    categoria: 'gift_card',
    etiqueta_gmail: 'Gift card',
    titulo: 'Giftcard no encontrada en el correo',
    texto: `Hola (Nombre), gracias por contactarnos.

Revisamos tu caso, y en nuestra base de datos encontramos que el correo con tu código fue enviado y entregado a tu correo (correo) el (día) de (mes) a las (hora) hrs, el cual aún no ha sido abierto.

Te recomendamos revisar tu bandeja de spam. También es importante recordar que el código se puede activar desde 13go.cl/user con tu sesión ya iniciada, luego canjeas tu código.

Quedamos atentos a tus comentarios y a cualquier duda.

Saludos.`
  },

  // PROBLEMA: Usuario no sabe cómo activar su código giftcard
  activar_giftcard: {
    categoria: 'gift_card',
    etiqueta_gmail: 'Gift card',
    titulo: 'Cómo activar código giftcard',
    texto: `Hola (Nombre), gracias por contactarnos.

Para activar tu suscripción con tu gift card, primero debes presionar el botón de "Obtener código". Luego, ingresa desde tu navegador a 13go.cl/user, donde encontrarás la opción para agregar tu tarjeta e ingresar el código correspondiente.

Al realizar estos pasos, podrás disfrutar de todo el contenido de 13Go.

Quedamos atentos a tus comentarios y a cualquier duda adicional.

Saludos.`
  },

  // PROBLEMA: Usuario envió comprobante — se adjunta código giftcard
  giftcard_envio_codigo: {
    categoria: 'gift_card',
    etiqueta_gmail: 'Gift card',
    titulo: 'Envío de código tras recibir comprobante',
    texto: `Hola (Nombre).

Te adjuntamos tu código de tu giftcard. También es importante recordar que para activar tu suscripción con tu giftcard, solo debes ingresar a través de tu navegador a 13go.cl/user y en ese mismo lugar tendrás la opción de agregar tu tarjeta giftcard.

Al realizar estos pasos, podrás disfrutar del contenido de 13Go.

Quedamos atentos a cualquier duda.

Saludos.`
  },

  // ============================================================
  // CATEGORÍA: PROBLEMA DE FACTURACIÓN
  // Etiqueta Gmail: "Problema de facturación"
  // ============================================================

  // PROBLEMA: Se procesó un reembolso y hay que notificarlo
  reembolso_procesado: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Reembolso procesado — notificación al usuario',
    texto: `Hola (Nombre), gracias por contactarnos.

Revisamos tu caso y acabamos de cursar un reembolso el cual fue enviado a tu correo electrónico, solo debes aceptar y seguir el proceso de devolución.

Para tu tranquilidad, te confirmamos que no recibirás nuevos cobros.

Estaremos atentos a cualquier otra duda.

Que tengas un excelente día.`
  },

  // PROBLEMA: Cobro asociado a otra cuenta con la misma tarjeta
  cobro_otra_cuenta: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Cobro en cuenta diferente con la misma tarjeta',
    texto: `Hola (Nombre), gracias por contactarnos. Lamentamos la tardanza con tu solicitud.

Revisamos tu cuenta y corroboramos que esta se encuentra cancelada, pero al parecer hay otra cuenta a nombre de "(nombre del usuario)" que está asociada a su tarjeta, ya que coinciden los últimos 4 dígitos y las fechas de cobro son las mismas que nos enviaste en las fotos.

Necesitamos saber si tienes acceso a esa cuenta para que puedas finalizar dicha suscripción y evitar que se hagan las solicitudes de cobro.

Estaremos atentos a su respuesta, que tengas un buen día.`
  },

  // PROBLEMA: Usuario cree que se hicieron cobros sin su autorización
  cobro_sin_autorizacion: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Aclaración: cobros no se realizan sin autorización',
    texto: `Hola (Nombre), gracias por contactarnos.

Revisamos tu caso, y vimos que tu cuenta ya fue cancelada el día (fecha) a las (hora).

Para tu tranquilidad, no recibirás más cobros futuros.

También es importante aclarar que nuestro sistema no tiene la facultad de realizar cobros a tu cuenta bancaria sin tu autorización. La única forma es que el dueño de la cuenta haya aprobado el uso de la tarjeta con anterioridad. En este caso, esa autorización se realizó el día (fecha) a las (hora) hrs.

Estaremos atentos ante cualquier duda.

Saludos.`
  },

  // PROBLEMA: Usuario recibió un doble cobro
  doble_cobro: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Doble cobro — reembolso cursado',
    texto: `Hola (Nombre), gracias por contactarnos.

Revisamos tu caso y efectivamente se realizó un doble cobro. Esto ocurrió debido a que una vez cumplido el tiempo de prueba, nuestro sistema intentó efectuar el cobro por los siguientes 3 días, eso se solapó con la activación manual del pago.

Acabamos de cursar una solicitud de reembolso que debería estar ya en tu correo electrónico, solo debes aceptarla y el proceso se efectuará de forma automática.

Nos disculpamos por el inconveniente y agradecemos tu contacto.

Que tengas un excelente día.`
  },

  // PROBLEMA: Usuario pide reembolso pero no corresponde según política
  reembolso_no_corresponde: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Reembolso no corresponde — explicación de política',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos revisado tu caso en nuestro sistema. Confirmamos que realizaste la cancelación de tu suscripción el día (fecha). Sin embargo, tu periodo de prueba gratuito había finalizado previamente el día (fecha).

El cobro automático se procesó el día (fecha) debido a que nuestro sistema había intentado realizar el cobro pendiente desde antes de la fecha de cancelación.

Lamentablemente, no podemos procesar un reembolso por una cancelación realizada después de la finalización del periodo de prueba.

No obstante, te confirmamos que no se generarán cobros futuros en tu cuenta una vez que finalice tu plan actual.

Quedamos atentos a cualquier otra duda o consulta que tengas.

Saludos.`
  },

  // PROBLEMA: Tarjeta rechazada por el banco al intentar cobrar
  tarjeta_rechazada: {
    categoria: 'problema_de_facturacion',
    etiqueta_gmail: 'Problema de facturación',
    titulo: 'Tarjeta rechazada en cobro',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos revisado tu caso en nuestro sistema. Según nuestros registros, los intentos de cobro asociados a tu tarjeta de débito/crédito están siendo rechazados por tu entidad bancaria por "exceder el monto máximo".

Para solucionar este inconveniente, te recomendamos cambiar tu método de pago directamente en la plataforma o comunicarte con tu banco.

Adicionalmente, si tienes algún comprobante del cobro donde se vea la fecha y hora del detalle, por favor envíanoslo para revisarlo.

Ante cualquier otra duda o consulta no dudes en contactarnos.

Saludos, que tengas un buen día.`
  },

  // ============================================================
  // CATEGORÍA: REEMBOLSO
  // Etiqueta Gmail: "Reembolso"
  // (casos donde el foco es devolver dinero, no solo facturación)
  // ============================================================

  // PROBLEMA: Gestión directa de devolución de dinero
  solicitud_reembolso: {
    categoria: 'reembolso',
    etiqueta_gmail: 'Reembolso',
    titulo: 'Solicitud de reembolso — en revisión',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos recibido tu solicitud de reembolso y la estamos revisando. Te responderemos en un plazo máximo de 48 horas hábiles con el estado de tu caso.

Para tu tranquilidad, no se generarán cobros adicionales mientras revisamos tu situación.

Quedamos atentos a cualquier duda.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: REACTIVACIÓN
  // Etiqueta Gmail: "Reactivación"
  // (requiere intervención de TI — escalar)
  // ============================================================

  // PROBLEMA: Usuario necesita reactivar su suscripción (escalar a TI)
  reactivacion_suscripcion: {
    categoria: 'reactivacion',
    etiqueta_gmail: 'Reactivación',
    titulo: 'Reactivación de suscripción — escalar a TI',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos recibido tu solicitud de reactivación. Estamos revisando tu caso y lo estamos gestionando con nuestro equipo técnico para resolverlo a la brevedad.

Te confirmaremos por este mismo medio en cuanto esté solucionado.

Quedamos atentos a cualquier duda.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: CUENTAS CORPORATIVAS
  // Etiqueta Gmail: "Cuentas corporativas"
  // ============================================================

  // PROBLEMA: Consulta o gestión de cuenta corporativa
  cuenta_corporativa: {
    categoria: 'cuentas_corporativas',
    etiqueta_gmail: 'Cuentas corporativas',
    titulo: 'Consulta de cuenta corporativa',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos recibido tu consulta sobre tu cuenta corporativa. Para gestionar correctamente tu caso, necesitamos los siguientes datos:

- Nombre de la empresa o razón social
- RUT de la empresa
- Correo de contacto del administrador de la cuenta

Una vez que contemos con esa información, podremos revisar y gestionar tu solicitud a la brevedad.

Quedamos atentos.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: SAMSUNG / LG
  // Etiqueta Gmail: "Samsung/LG"
  // (dispositivos específicos con problemas de compatibilidad)
  // ============================================================

  // PROBLEMA: Error específico en Samsung o LG — misma respuesta que smart TV
  samsung_lg_problema: {
    categoria: 'samsung_lg',
    etiqueta_gmail: 'Samsung/LG',
    titulo: 'Problema en Samsung o LG — app sin actualizar',
    texto: `Hola (Nombre), gracias por contactarnos.

Los Smart TV LG y algunos modelos Samsung pueden estar experimentando problemas debido a que la actualización de la aplicación 13Go aún está en proceso de aprobación por parte de sus respectivas tiendas.

Lamentablemente, estos procesos dependen de los tiempos de revisión de cada plataforma, los cuales están fuera de nuestro control. Estamos haciendo todo lo posible para que esté disponible pronto.

Apenas se publique la actualización, te avisaremos por este medio.

Quedamos atentos a tus comentarios.

Saludos.`
  },

  // ============================================================
  // CATEGORÍA: STARLINK
  // Etiqueta Gmail: "Starlink"
  // (problemas de conectividad o compatibilidad con Starlink)
  // ============================================================

  // PROBLEMA: Usuario con conexión Starlink reporta problemas
  starlink_problema: {
    categoria: 'starlink',
    etiqueta_gmail: 'Starlink',
    titulo: 'Problema de reproducción con Starlink',
    texto: `Hola (Nombre), gracias por contactarnos.

Hemos tomado nota de tu caso. Para usuarios con conexión Starlink, algunos problemas de reproducción pueden estar relacionados con la latencia o configuración de red de este tipo de conexión satelital.

Para ayudarte mejor, ¿podrías indicarnos:
- ¿El problema ocurre solo en 13GO o en otras plataformas también?
- ¿Usas la app en televisor, celular o computador?
- ¿El error ocurre al iniciar la reproducción o durante ella?

Con esa información podremos orientarte de mejor manera.

Quedamos atentos.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: FLOW
  // Etiqueta Gmail: "Flow"
  // (usuarios que llegan por el operador Flow)
  // ============================================================

  // PROBLEMA: Consulta relacionada con suscripción vía Flow
  flow_consulta: {
    categoria: 'flow',
    etiqueta_gmail: 'Flow',
    titulo: 'Consulta de usuario Flow',
    texto: `Hola (Nombre), gracias por contactarnos.

Para gestionar correctamente tu caso como usuario Flow, necesitamos los siguientes datos:

- RUT o número de cliente Flow
- Correo registrado en 13GO
- Descripción del problema o consulta

Con esa información podremos revisar tu situación y darte una respuesta a la brevedad.

Quedamos atentos.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍA: CAÍDA DE FIREBASE
  // Etiqueta Gmail: "Caida de Firebase"
  // (incidentes técnicos masivos — escalar a TI)
  // ============================================================

  // PROBLEMA: Caída o error masivo relacionado con Firebase
  caida_firebase: {
    categoria: 'caida_firebase',
    etiqueta_gmail: 'Caida de Firebase',
    titulo: 'Caída de Firebase — respuesta de incidente',
    texto: `Hola (Nombre), gracias por contactarnos.

Estamos al tanto de que algunos usuarios están experimentando inconvenientes para acceder a la plataforma. Nuestro equipo técnico ya está trabajando en la solución.

Lamentamos los inconvenientes causados. Te informaremos por este mismo medio en cuanto el servicio esté restablecido.

Gracias por tu paciencia.

Saludos,
Equipo 13GO`
  },

  // ============================================================
  // CATEGORÍAS SIN ETIQUETA GMAIL ESPECÍFICA
  // Ingreso manual o etiqueta "Pendiente" / "Sin respuesta de usuario"
  // ============================================================

  // PROBLEMA: Usuario quiere suscribirse por primera vez
  nueva_suscripcion: {
    categoria: 'suscripcion_general',
    etiqueta_gmail: null,
    titulo: 'Cómo suscribirse',
    texto: `Hola (Nombre), gracias por contactarnos.

Para suscribirte a la plataforma solo debes ingresar a través de tu navegador a 13go.cl/user y seleccionar el plan de tu preferencia.

Después de escoger el plan, podrás disfrutar del contenido de 13Go.

Quedamos atentos a tus comentarios y a cualquier duda.

Saludos, que tengas un excelente día.`
  },

  // PROBLEMA: Usuario quiere cambiar su método de pago
  cambio_metodo_pago: {
    categoria: 'suscripcion_general',
    etiqueta_gmail: null,
    titulo: 'Cambio de método de pago',
    texto: `¡Hola, (Nombre)!

Muchas gracias por escribirnos. Para actualizar o cambiar tu método de pago, solo debes seguir estos pasos:

- Ingresa a nuestra web: 13go.cl/user
- En el costado derecho, busca la sección "Mi suscripción".
- Haz clic en la opción "Modificar método de pago".
- Sigue las instrucciones en pantalla para ingresar tu nueva tarjeta o medio de preferencia.

¡Y listo! Con esto ya podrás seguir disfrutando de todo nuestro contenido sin interrupciones.

Quedamos atentos a cualquier otra duda que tengas.

Soporte Equipo 13GO`
  },

  // PROBLEMA: Necesitamos más antecedentes (caso genérico)
  pedir_mas_antecedentes: {
    categoria: 'sin_clasificar',
    etiqueta_gmail: null,
    titulo: 'Solicitar más información al usuario',
    texto: `Hola,

Muchas gracias por contactarnos. Lamentamos los inconvenientes que estás experimentando.

Para poder revisar tu caso, necesitamos conocer un poco más sobre lo que ocurre. ¿Podrías enviarnos una captura de pantalla del error o del mensaje que aparece?

Además, si pudieras indicarnos el modelo de tu dispositivo o desde qué plataforma estás accediendo, nos sería de gran ayuda para agilizar el diagnóstico.

Quedamos atentos a tus comentarios para poder ayudarte lo antes posible.

Saludos cordiales,
Soporte 13GO`
  }

};

// ============================================================
// MAPEO: etiqueta Gmail real — categoría interna + prioridad
// Estas etiquetas deben coincidir EXACTAMENTE con las que
// configuraste en Gmail — Filtros y direcciones bloqueadas
// ============================================================
const LABEL_MAP = {
  'Caida de Firebase':       { categoria: 'caida_firebase',         prioridad: 'P1-Critico' },
  'Clave y acceso':          { categoria: 'clave_y_acceso',         prioridad: 'P2-Alto'    },
  'Contenidos':              { categoria: 'contenidos',             prioridad: 'P3-Normal'  },
  'Cuentas corporativas':    { categoria: 'cuentas_corporativas',   prioridad: 'P2-Alto'    },
  'Dar de baja':             { categoria: 'dar_de_baja',            prioridad: 'P2-Alto'    },
  'Flow':                    { categoria: 'flow',                   prioridad: 'P3-Normal'  },
  'Gift card':               { categoria: 'gift_card',              prioridad: 'P3-Normal'  },
  'Pendiente':               { categoria: 'sin_clasificar',         prioridad: 'P3-Normal'  },
  'Problema de facturación': { categoria: 'problema_de_facturacion',prioridad: 'P2-Alto'    },
  'Reactivación':            { categoria: 'reactivacion',           prioridad: 'P1-Critico' },
  'Reembolso':               { categoria: 'reembolso',              prioridad: 'P2-Alto'    },
  'Resuelto':                { categoria: 'sin_clasificar',         prioridad: 'P4-Menor'   },
  'Resuelto por el usuario': { categoria: 'sin_clasificar',         prioridad: 'P4-Menor'   },
  'Samsung/LG':              { categoria: 'samsung_lg',             prioridad: 'P3-Normal'  },
  'Sin respuesta de usuario':{ categoria: 'sin_clasificar',         prioridad: 'P4-Menor'   },
  'Starlink':                { categoria: 'starlink',               prioridad: 'P3-Normal'  }
};

// ============================================================
// PLANTILLA SUGERIDA POR CATEGORÍA
// Primera plantilla que aparece al seleccionar la categoría
// ============================================================
const PLANTILLA_POR_CATEGORIA = {
  dar_de_baja:              'cancelar_suscripcion',
  clave_y_acceso:           'olvido_contrasena',
  contenidos:               'pedir_antecedentes_contenido',
  cuentas_corporativas:     'cuenta_corporativa',
  flow:                     'flow_consulta',
  gift_card:                'giftcard_no_encontrada',
  problema_de_facturacion:  'tarjeta_rechazada',
  reactivacion:             'reactivacion_suscripcion',
  reembolso:                'solicitud_reembolso',
  samsung_lg:               'samsung_lg_problema',
  starlink:                 'starlink_problema',
  caida_firebase:           'caida_firebase',
  suscripcion_general:      'nueva_suscripcion',
  sin_clasificar:           'pedir_mas_antecedentes'
};

// ============================================================
// CATEGORÍAS QUE REQUIEREN ESCALAMIENTO A TI
// La app mostrará alerta automática al seleccionar estas
// ============================================================
const CATEGORIAS_ESCALAR_TI = [
  'reactivacion',
  'caida_firebase',
  'reembolso'
];
