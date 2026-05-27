/**
 * Las 38 rutas conocidas del Vue Router de Vidroop, extraídas durante la auditoría.
 * Solo las "estáticas" (sin :params) son visitables directamente por el crawler.
 * Las dinámicas requieren seed con UUIDs reales (creadas en runtime).
 */

export type VidroopRoute = {
  path: string;
  name: string;
  isDynamic: boolean;
  requiresAuth: boolean;
  notes?: string;
};

export const VIDROOP_ROUTES: VidroopRoute[] = [
  // Auth / utils
  { path: "/login", name: "userLogin", isDynamic: false, requiresAuth: false },
  { path: "/logout", name: "logout", isDynamic: false, requiresAuth: true },
  { path: "/acceso-inicial", name: "initialAccess", isDynamic: false, requiresAuth: true },
  { path: "/acceso-denegado", name: "accessDenied", isDynamic: false, requiresAuth: false },
  { path: "/no-encontrado", name: "notFound", isDynamic: false, requiresAuth: false },
  { path: "/recuperar-contraseña", name: "forgetPassword", isDynamic: false, requiresAuth: false },
  { path: "/nueva-contraseña", name: "confirmForgotPassword", isDynamic: false, requiresAuth: false },
  { path: "/reset-password", name: "resetPassword", isDynamic: false, requiresAuth: false },
  { path: "/limpiar-cache", name: "clearCache", isDynamic: false, requiresAuth: false },

  // Plan / licencia
  { path: "/", name: "home", isDynamic: false, requiresAuth: true },
  { path: "/actualizar-mi-plan", name: "landingUpgradePlan", isDynamic: false, requiresAuth: true },
  { path: "/actualizar-licencia", name: "updatingLicence", isDynamic: false, requiresAuth: true, notes: "Redirige a /gestion/pagos-vidroop/plan-suscrito" },

  // Academia
  { path: "/academia/usuarios", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/invitaciones", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/configuracion", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/datos-academia", name: "academy", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/terminos-y-condiciones", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/clausula-correo", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/politicas-de-privacidad", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/textos-legales/firma-de-email", name: "academyChild1", isDynamic: false, requiresAuth: true },
  { path: "/academia/autoresponders", name: "academy", isDynamic: false, requiresAuth: true },

  // Mi Cuenta
  { path: "/mi-cuenta/perfil", name: "account", isDynamic: false, requiresAuth: true },
  { path: "/mi-cuenta/seguridad", name: "account", isDynamic: false, requiresAuth: true },

  // Gestión
  { path: "/gestion/mis-ventas", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/puntos-de-venta", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/medios-de-pago", name: "billing", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/historial-de-facturas", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/mis-datos-de-facturacion", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/plan-suscrito", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/medio-de-pago", name: "billingChild1", isDynamic: false, requiresAuth: true },
  { path: "/gestion/pagos-vidroop/cancelar-suscripcion", name: "billingChild1", isDynamic: false, requiresAuth: true },

  // Listados
  { path: "/formaciones", name: "projects", isDynamic: false, requiresAuth: true },
  { path: "/productos", name: "products", isDynamic: false, requiresAuth: true },

  // Dinámicas (no las visita el crawler por path; requieren seed con UUIDs)
  { path: "/academia/:subject", name: "academy", isDynamic: true, requiresAuth: true },
  { path: "/mi-cuenta/:subject", name: "account", isDynamic: true, requiresAuth: true },
  { path: "/gestion/:subject", name: "billing", isDynamic: true, requiresAuth: true },
  { path: "/curso/:id/:subject", name: "asset", isDynamic: true, requiresAuth: true },
  { path: "/producto/:id/:subject", name: "product", isDynamic: true, requiresAuth: true },
  { path: "/mapa/:id/:subject", name: "map", isDynamic: true, requiresAuth: true },
  { path: "/configuracion-inicial/:id", name: "initialSetup", isDynamic: true, requiresAuth: true },
];

export const STATIC_ROUTES = VIDROOP_ROUTES.filter((r) => !r.isDynamic);
