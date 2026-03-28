import type {
  AppLanguage,
  ForumStatus,
  OpenRouterSortMode,
  ProviderKind,
} from "@/lib/domain";

export type CopyDictionary = {
  appName: string;
  appSubtitle: string;
  navForums: string;
  navNewForum: string;
  navSettings: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  heroPrimary: string;
  heroSecondary: string;
  metricsTitle: string;
  forumsTitle: string;
  forumsSubtitle: string;
  forumsEmptyTitle: string;
  createTitle: string;
  createSubtitle: string;
  countLabel: string;
  agentsLabel: string;
  agentSlotPrefix: string;
  contextLabel: string;
  titleLabel: string;
  ideaLabel: string;
  documentsLabel: string;
  moderatorLabel: string;
  providerLabel: string;
  modelLabel: string;
  nameLabel: string;
  moderatorHint: string;
  openRouterSortLabel: string;
  providerUnavailableLabel: string;
  noModelsLabel: string;
  openSettings: string;
  confirmLaunch: string;
  confirmBody: string;
  cancel: string;
  submit: string;
  settingsTitle: string;
  settingsSubtitle: string;
  settingsCopilotTitle: string;
  settingsCopilotBody: string;
  settingsCopilotLoggedInAs: string;
  settingsCopilotTokenLabel: string;
  settingsCopilotTokenHint: string;
  settingsCopilotTokenPlaceholder: string;
  settingsCopilotTokenConfiguredBody: string;
  settingsCopilotTokenMissingBody: string;
  settingsCopilotTokenSaved: string;
  settingsCopilotTokenCleared: string;
  settingsOpenRouterTitle: string;
  settingsOpenRouterBody: string;
  settingsOpenRouterConfiguredBody: string;
  settingsOpenRouterMissingBody: string;
  settingsOpenRouterInputLabel: string;
  settingsOpenRouterInputHint: string;
  settingsOpenRouterPlaceholder: string;
  settingsOpenRouterSaved: string;
  settingsOpenRouterCleared: string;
  settingsDeepSeekTitle: string;
  settingsDeepSeekBody: string;
  settingsDeepSeekConfiguredBody: string;
  settingsDeepSeekMissingBody: string;
  settingsDeepSeekInputLabel: string;
  settingsDeepSeekInputHint: string;
  settingsDeepSeekPlaceholder: string;
  settingsStatusLabel: string;
  settingsStoredTokenLabel: string;
  settingsConfigured: string;
  settingsNotConfigured: string;
  settingsLoadingStatus: string;
  settingsSaveButton: string;
  settingsClearButton: string;
  settingsSaving: string;
  settingsDeepSeekSaved: string;
  settingsDeepSeekCleared: string;
  settingsSaveError: string;
  settingsLoadError: string;
  requestedDocsHint: string;
  launchPackageLabel: string;
  moderatorSummaryLabel: string;
  summaryModeratorLabel: string;
  summaryForumLabel: string;
  summaryAgentsLabel: string;
  summaryProvidersLabel: string;
  summaryDocumentsLabel: string;
  summaryContextLabel: string;
  summaryCompactionLabel: string;
  workflowLabel: string;
  workflowStep1: string;
  workflowStep2: string;
  workflowStep3: string;
  openFlowButton: string;
  metricAgents: string;
  metricDocs: string;
  metricRounds: string;
  themeLight: string;
  themeDark: string;
  dashboardMetrics: {
    totalLabel: string;
    totalDetail: string;
    activeLabel: string;
    activeDetail: string;
    attentionLabel: string;
    attentionDetail: string;
    documentsLabel: string;
    documentsDetail: string;
  };
  providerGroup: Record<ProviderKind, string>;
  openRouterSort: Record<OpenRouterSortMode, string>;
  statuses: Record<ForumStatus, string>;
};

export const copy: Record<AppLanguage, CopyDictionary> = {
  en: {
    appName: "Agora",
    appSubtitle: "AI debate orchestration",
    navForums: "Forums",
    navNewForum: "New forum",
    navSettings: "Settings",
    heroEyebrow: "Multi-agent debate workspace",
    heroTitle: "Design debate workflows before wiring real providers.",
    heroBody:
      "This first implementation pass establishes the product shell, provider-aware forum setup, and the visual system that the later orchestration engine will plug into.",
    heroPrimary: "Create forum",
    heroSecondary: "Read brief",
    metricsTitle: "Current signal",
    forumsTitle: "Forum pipeline",
    forumsSubtitle: "Forums will appear here once they are created.",
    forumsEmptyTitle: "No forums yet",
    createTitle: "Create a new forum",
    createSubtitle:
      "Configure the moderator context, choose 2 to 5 agents, and define the Markdown deliverables the debate must close.",
    countLabel: "Number of agents",
    agentsLabel: "Agents",
    agentSlotPrefix: "Agent",
    contextLabel: "Context",
    titleLabel: "Forum title",
    ideaLabel: "Problem and desired outcome",
    documentsLabel: "Documents to generate",
    moderatorLabel: "Moderator",
    providerLabel: "AI provider",
    modelLabel: "Model",
    nameLabel: "Agent name",
    moderatorHint:
      "The moderator only defines provider and model. All clarification, brainstorming, and document rounds share this moderator context window.",
    openRouterSortLabel: "OpenRouter order",
    providerUnavailableLabel: "Provider unavailable",
    noModelsLabel: "No models available for this provider.",
    openSettings: "Open settings",
    confirmLaunch: "Start clarification",
    confirmBody:
      "The moderator will review the idea, decide whether clarification is needed, and generate the first understanding draft.",
    cancel: "Cancel",
    submit: "Submit forum",
    settingsTitle: "Provider settings",
    settingsSubtitle:
      "Copilot uses the logged-in Copilot CLI session on this server. DeepSeek keeps its API key encrypted on the server and only stores an opaque session cookie in the browser.",
    settingsCopilotTitle: "Copilot CLI connection",
    settingsCopilotBody:
      "Agora auto-detects your local Copilot CLI installation. If you already ran `/login` there, the app should work without extra configuration. A stored GitHub token is only an optional fallback.",
    settingsCopilotLoggedInAs: "Logged in as",
    settingsCopilotTokenLabel: "GitHub token for Copilot",
    settingsCopilotTokenHint:
      "Optional. If this token is stored, Agora uses it before trying Copilot CLI login.",
    settingsCopilotTokenPlaceholder: "github_pat_...",
    settingsCopilotTokenConfiguredBody:
      "A GitHub token is already stored securely for this browser session.",
    settingsCopilotTokenMissingBody:
      "No GitHub token is stored. Agora will fall back to Copilot CLI login.",
    settingsCopilotTokenSaved:
      "GitHub token stored securely. Agora will prefer it for Copilot requests.",
    settingsCopilotTokenCleared:
      "Stored GitHub token removed. Agora will fall back to Copilot CLI login.",
    settingsOpenRouterTitle: "OpenRouter API key",
    settingsOpenRouterBody:
      "OpenRouter keeps its API key encrypted on the server. Agora uses it for authenticated OpenRouter requests and falls back to OPENROUTER_API_KEY when present.",
    settingsOpenRouterConfiguredBody:
      "An OpenRouter API key is already stored for this browser session.",
    settingsOpenRouterMissingBody:
      "No OpenRouter API key is stored for this browser session yet.",
    settingsOpenRouterInputLabel: "OpenRouter API key",
    settingsOpenRouterInputHint:
      "Leave the field empty unless you want to replace the existing key.",
    settingsOpenRouterPlaceholder: "sk-or-v1-...",
    settingsOpenRouterSaved:
      "OpenRouter key saved securely on the server.",
    settingsOpenRouterCleared:
      "OpenRouter key removed from server storage.",
    settingsDeepSeekTitle: "DeepSeek API key",
    settingsDeepSeekBody:
      "DeepSeek remains configurable from the app. The key is encrypted on the server before being written to Agora server storage.",
    settingsDeepSeekConfiguredBody:
      "A DeepSeek API key is already stored for this browser session.",
    settingsDeepSeekMissingBody:
      "No DeepSeek API key is stored for this browser session yet.",
    settingsDeepSeekInputLabel: "DeepSeek API key",
    settingsDeepSeekInputHint:
      "Leave the field empty unless you want to replace the existing key.",
    settingsDeepSeekPlaceholder: "sk-...",
    settingsStatusLabel: "Status",
    settingsStoredTokenLabel: "Stored token",
    settingsConfigured: "Configured",
    settingsNotConfigured: "Missing",
    settingsLoadingStatus: "Checking runtime connection...",
    settingsSaveButton: "Save key",
    settingsClearButton: "Clear key",
    settingsSaving: "Saving...",
    settingsDeepSeekSaved: "DeepSeek key saved securely on the server.",
    settingsDeepSeekCleared: "DeepSeek key removed from server storage.",
    settingsSaveError: "Unable to update provider settings.",
    settingsLoadError: "Unable to load the current settings state.",
    requestedDocsHint: "One Markdown document per line keeps downstream generation simpler.",
    launchPackageLabel: "Launch package",
    moderatorSummaryLabel: "Moderator-ready summary",
    summaryModeratorLabel: "Moderator",
    summaryForumLabel: "Forum",
    summaryAgentsLabel: "Agents",
    summaryProvidersLabel: "Providers",
    summaryDocumentsLabel: "Documents",
    summaryContextLabel: "Context window",
    summaryCompactionLabel: "Compaction",
    workflowLabel: "Workflow",
    workflowStep1: "1. Moderator clarifies gaps before debate.",
    workflowStep2:
      "2. The understanding document replaces prior clarification Q&A in the moderator context.",
    workflowStep3:
      "3. Context compacts at 60%, then brainstorming and document rounds continue in Markdown.",
    openFlowButton: "Open flow",
    metricAgents: "Agents",
    metricDocs: "Docs",
    metricRounds: "Rounds",
    themeLight: "Light",
    themeDark: "Dark",
    dashboardMetrics: {
      totalLabel: "Total forums",
      totalDetail: "Currently visible in this workspace",
      activeLabel: "Active forums",
      activeDetail: "Open clarification, review, or debate",
      attentionLabel: "Need attention",
      attentionDetail: "Waiting on clarification or review",
      documentsLabel: "Requested docs",
      documentsDetail: "Across all visible forums",
    },
    providerGroup: {
      copilot: "Copilot SDK",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
    },
    openRouterSort: {
      popular: "Popular (OpenRouter default)",
      newest: "Newest",
    },
    statuses: {
      draft: "Draft",
      clarification: "Clarification",
      review: "Review",
      debating: "Debating",
      completed: "Completed",
      paused: "Paused",
    },
  },
  es: {
    appName: "Agora",
    appSubtitle: "Orquestación de debates con IA",
    navForums: "Foros",
    navNewForum: "Nuevo foro",
    navSettings: "Settings",
    heroEyebrow: "Espacio de debate multiagente",
    heroTitle: "Diseña el flujo de debate antes de cablear los proveedores reales.",
    heroBody:
      "Esta primera etapa de implementación deja lista la base visual, la creación de foros con conciencia de proveedor y el shell del producto donde luego se conectará el motor de orquestación.",
    heroPrimary: "Crear foro",
    heroSecondary: "Leer brief",
    metricsTitle: "Estado actual",
    forumsTitle: "Pipeline de foros",
    forumsSubtitle: "Los foros aparecerán aquí una vez que se creen.",
    forumsEmptyTitle: "Aún no hay foros",
    createTitle: "Crear un nuevo foro",
    createSubtitle:
      "Configura el contexto del moderador, elige de 2 a 5 agentes y define los entregables Markdown que el debate debe cerrar.",
    countLabel: "Número de agentes",
    agentsLabel: "Agentes",
    agentSlotPrefix: "Agente",
    contextLabel: "Contexto",
    titleLabel: "Título del foro",
    ideaLabel: "Problema y resultado esperado",
    documentsLabel: "Documentos a generar",
    moderatorLabel: "Moderador",
    providerLabel: "Proveedor de IA",
    modelLabel: "Modelo",
    nameLabel: "Nombre del agente",
    moderatorHint:
      "Para el moderador solo se define proveedor y modelo. Todas las rondas de clarificación, lluvia de ideas y documentos comparten esta ventana de contexto.",
    openRouterSortLabel: "Orden de OpenRouter",
    providerUnavailableLabel: "Proveedor no disponible",
    noModelsLabel: "No hay modelos disponibles para este proveedor.",
    openSettings: "Abrir settings",
    confirmLaunch: "Iniciar clarificación",
    confirmBody:
      "El moderador revisará la idea, decidirá si necesita preguntas de aclaración y generará el primer borrador de entendimiento.",
    cancel: "Cancelar",
    submit: "Enviar foro",
    settingsTitle: "Settings de proveedores",
    settingsSubtitle:
      "Copilot usa la sesión iniciada en Copilot CLI en este servidor. DeepSeek sigue usando una API key cifrada en el servidor; en el navegador solo queda una cookie opaca de sesión.",
    settingsCopilotTitle: "Conexión de Copilot CLI",
    settingsCopilotBody:
      "Agora detecta automáticamente tu instalación local de Copilot CLI. Si ya hiciste `/login` ahí, la app debería funcionar sin configuración extra. El token guardado de GitHub queda solo como fallback opcional.",
    settingsCopilotLoggedInAs: "Sesión detectada para",
    settingsCopilotTokenLabel: "Token de GitHub para Copilot",
    settingsCopilotTokenHint:
      "Opcional. Si este token está guardado, Agora lo usa antes de intentar el login de Copilot CLI.",
    settingsCopilotTokenPlaceholder: "github_pat_...",
    settingsCopilotTokenConfiguredBody:
      "Ya existe un token de GitHub guardado de forma segura para esta sesión del navegador.",
    settingsCopilotTokenMissingBody:
      "No hay token de GitHub guardado. Agora usará Copilot CLI como fallback.",
    settingsCopilotTokenSaved:
      "El token de GitHub quedó guardado de forma segura. Agora lo priorizará para Copilot.",
    settingsCopilotTokenCleared:
      "El token guardado fue eliminado. Agora volverá a usar Copilot CLI como fallback.",
    settingsOpenRouterTitle: "API key de OpenRouter",
    settingsOpenRouterBody:
      "OpenRouter mantiene su API key cifrada en el servidor. Agora la usa para requests autenticados a OpenRouter y hace fallback a OPENROUTER_API_KEY si existe.",
    settingsOpenRouterConfiguredBody:
      "Ya existe una API key de OpenRouter guardada para esta sesión del navegador.",
    settingsOpenRouterMissingBody:
      "Todavía no hay una API key de OpenRouter guardada para esta sesión del navegador.",
    settingsOpenRouterInputLabel: "API key de OpenRouter",
    settingsOpenRouterInputHint:
      "Deja el campo vacío salvo que quieras reemplazar la key actual.",
    settingsOpenRouterPlaceholder: "sk-or-v1-...",
    settingsOpenRouterSaved:
      "La key de OpenRouter quedó guardada de forma segura en el servidor.",
    settingsOpenRouterCleared:
      "La key de OpenRouter fue eliminada del almacenamiento del servidor.",
    settingsDeepSeekTitle: "API key de DeepSeek",
    settingsDeepSeekBody:
      "DeepSeek sigue siendo configurable desde la app. La key se cifra en el servidor antes de guardarse en el almacenamiento del servidor de Agora.",
    settingsDeepSeekConfiguredBody:
      "Ya existe una API key de DeepSeek guardada para esta sesión del navegador.",
    settingsDeepSeekMissingBody:
      "Todavía no hay una API key de DeepSeek guardada para esta sesión del navegador.",
    settingsDeepSeekInputLabel: "API key de DeepSeek",
    settingsDeepSeekInputHint:
      "Deja el campo vacío salvo que quieras reemplazar la key actual.",
    settingsDeepSeekPlaceholder: "sk-...",
    settingsStatusLabel: "Estado",
    settingsStoredTokenLabel: "Token guardado",
    settingsConfigured: "Configurado",
    settingsNotConfigured: "Falta",
    settingsLoadingStatus: "Verificando conexión del runtime...",
    settingsSaveButton: "Guardar key",
    settingsClearButton: "Eliminar key",
    settingsSaving: "Guardando...",
    settingsDeepSeekSaved: "La key de DeepSeek quedó guardada de forma segura en el servidor.",
    settingsDeepSeekCleared: "La key de DeepSeek fue eliminada del almacenamiento del servidor.",
    settingsSaveError: "No fue posible actualizar los settings del proveedor.",
    settingsLoadError: "No fue posible cargar el estado actual de los settings.",
    requestedDocsHint: "Un documento Markdown por línea simplifica la generación posterior.",
    launchPackageLabel: "Paquete de lanzamiento",
    moderatorSummaryLabel: "Resumen para el moderador",
    summaryModeratorLabel: "Moderador",
    summaryForumLabel: "Foro",
    summaryAgentsLabel: "Agentes",
    summaryProvidersLabel: "Proveedores",
    summaryDocumentsLabel: "Documentos",
    summaryContextLabel: "Ventana de contexto",
    summaryCompactionLabel: "Compactación",
    workflowLabel: "Flujo de trabajo",
    workflowStep1: "1. El moderador aclara dudas antes del debate.",
    workflowStep2:
      "2. El documento de entendimiento reemplaza las preguntas y respuestas previas dentro del contexto del moderador.",
    workflowStep3:
      "3. El contexto se compacta al 60% y luego continúan las rondas Markdown.",
    openFlowButton: "Abrir flujo",
    metricAgents: "Agentes",
    metricDocs: "Docs",
    metricRounds: "Rondas",
    themeLight: "Claro",
    themeDark: "Oscuro",
    dashboardMetrics: {
      totalLabel: "Total de foros",
      totalDetail: "Visibles actualmente en este espacio",
      activeLabel: "Foros activos",
      activeDetail: "Con clarificación, revisión o debate abiertos",
      attentionLabel: "Requieren atención",
      attentionDetail: "Esperando clarificación o revisión",
      documentsLabel: "Docs solicitados",
      documentsDetail: "Sumados entre todos los foros visibles",
    },
    providerGroup: {
      copilot: "Copilot SDK",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
    },
    openRouterSort: {
      popular: "Populares (orden por defecto de OpenRouter)",
      newest: "Más nuevos",
    },
    statuses: {
      draft: "Borrador",
      clarification: "Clarificación",
      review: "Revisión",
      debating: "Debatiendo",
      completed: "Completado",
      paused: "Pausado",
    },
  },
};
