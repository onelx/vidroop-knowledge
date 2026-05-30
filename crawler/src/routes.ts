/**
 * Rutas conocidas de Vidroop. Duplicado de src/lib/vidroop/routes.ts
 * (el crawler corre en un workspace separado sin acceso al app de Next).
 */

export type VidroopRoute = {
  path: string;
  name: string;
  isDynamic: boolean;
  requiresAuth: boolean;
};

export const STATIC_ROUTES: VidroopRoute[] = [
  { path: "/", name: "home", isDynamic: false, requiresAuth: true },
  { path: "/actualizar-mi-plan", name: "landingUpgradePlan", isDynamic: false, requiresAuth: true },
  { path: "/actualizar-licencia", name: "updatingLicence", isDynamic: false, requiresAuth: true },
  { path: "/academia/usuarios", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/invitaciones", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/configuracion", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/datos-academia", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/terminos-y-condiciones", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/clausula-correo", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/politicas-de-privacidad", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/firma-de-email", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/autoresponders", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/mi-cuenta/perfil", name: "account", isDynamic: false, requiresAuth: true },
  { path: "/mi-cuenta/seguridad", name: "account", isDynamic: false, requiresAuth: true },
  { path: "/gestion/mis-ventas", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/puntos-de-venta", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/medios-de-pago", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/historial-de-facturas", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/mis-datos-de-facturacion", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/plan-suscrito", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/medio-de-pago", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/cancelar-suscripcion", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/formaciones", name: "projects", isDynamic: false, requiresAuth: true },
  { path: "/productos", name: "products", isDynamic: false, requiresAuth: true },
];

/**
 * Sub-páginas (`:subject`) de cada entidad dinámica. Se expanden con el UUID
 * descubierto en los listados: p.ej. `/curso/{id}/tarjeta`.
 * Fuente: auditoría manual (notes/05 cursos, notes/06 productos).
 */
export const CURSO_SUBJECTS: string[] = [
  "tarjeta",
  "contenidos",
  "activacion",
  "alumnos/alumnos",
  "alumnos/invitaciones",
  "alumnos/estadisticas",
  "mensajes",
];

export const PRODUCTO_SUBJECTS: string[] = [
  "tarjeta",
  "cursos-y-mapas-incluidos/cursos",
  "cursos-y-mapas-incluidos/mapas",
  "precios-y-planes",
  "codigos-de-descuento",
  "codigos-de-rastreo",
  "cartas-de-venta",
  "paginas-de-agradecimiento",
  "autoresponders",
];

// Mapa no se auditó en detalle (notes/05 §5.3). Set conservador: el router lo
// trata igual que un curso, así que recorremos sólo las sub-páginas seguras.
export const MAPA_SUBJECTS: string[] = [
  "tarjeta",
  "contenidos",
  "activacion",
  "alumnos/alumnos",
  "mensajes",
];
