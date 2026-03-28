# Agora

Aplicacion Next.js para orquestacion de foros multiagente con proveedores de modelos (Copilot SDK, OpenRouter y DeepSeek).

## Desarrollo local

1. Crea tu archivo de entorno a partir de `.env.example`.
2. Completa solo las variables que realmente necesites.

Ejecuta el servidor:

```bash
npm run dev
```

Luego abre http://localhost:3000.

## Archivo .env

Este proyecto incluye `.env.example` con las variables disponibles para desarrollo local y despliegue.

```bash
cp .env.example .env.local
```

Variables principales:

- `AGORA_PROVIDER_SETTINGS_KEY`: clave maestra opcional para cifrar settings de proveedor en el servidor.
- `AGORA_STORAGE_DIR`: ruta opcional donde Agora guarda los settings cifrados. Si no se define, localmente usa `.agora/`. En Docker se fija a `/app/data/.agora`.
- `OPENROUTER_API_KEY`: fallback global para OpenRouter cuando no se guardo una key desde `/settings`.
- `DEEPSEEK_API_KEY`: fallback global para catalogo de DeepSeek cuando no se guardo una key desde `/settings`.
- `COPILOT_CLI_PATH`: ruta opcional al binario de Copilot CLI si Agora no lo detecta automaticamente.
- `PORT`: puerto de la app. En desarrollo local normalmente sera `3000`; en Docker se usa `7575`.

Para Docker Compose no necesitas crear un `.env` obligatoriamente con estas variables, porque el contenedor ya define los defaults operativos en `docker-compose.yml`. Solo necesitas sobreescribirlas si quieres cambiar ese comportamiento.

## Autenticacion de Copilot SDK (solo Copilot CLI)

Esta aplicacion usa unicamente la autenticacion del usuario logeado en Copilot CLI para Copilot SDK. No hay ingreso manual de tokens para Copilot.

1. Instala Copilot CLI en el servidor donde corre la app.
2. Logeate con el mismo usuario del sistema que ejecuta `npm run dev` o `npm run start`.

```bash
copilot login
```

3. Verifica sesion:

La CLI disponible en este entorno no usa `copilot auth ...`; usa `copilot login` y almacena la sesion en el contexto del usuario del sistema.

Si la app corre en Docker, la autenticacion debe existir dentro del contenedor o en un volumen montado que conserve el estado del CLI.

## Docker + Copilot CLI

El `Dockerfile` instala `@github/copilot` globalmente y el `docker-compose.yml` usa solo el volumen `agora-data`. Dentro de ese volumen, la sesion del CLI se guarda en `/app/data/copilot` y los settings cifrados del servidor en `/app/data/.agora`.

1. Levanta la app:

```bash
docker compose up --build -d
```

2. Inicia sesion de Copilot dentro del contenedor de Agora:

```bash
docker compose exec agora copilot login
```

3. Sigue el flujo que te muestre la CLI en la terminal. La sesion queda guardada dentro de `agora-data`, en `/app/data/copilot`.

4. Revisa `/settings` en la app para confirmar que Agora detecta la sesion de Copilot CLI.

Si quieres abrir un shell dentro del contenedor antes de autenticarte:

```bash
docker compose exec agora sh
copilot login
```

Nota tecnica: en este proyecto el SDK se conecta a la CLI por TCP (`useStdio: false`) porque el transporte stdio no estaba devolviendo modelos correctamente en este entorno.

## Settings de OpenRouter

OpenRouter ahora tambien mantiene su API key desde la app:

1. Abre `/settings`.
2. Ingresa la API key de OpenRouter.
3. La key se cifra y se guarda del lado servidor en el almacenamiento configurado de Agora. En Docker queda en `/app/data/.agora`.

Como alternativa, tambien puedes definir `OPENROUTER_API_KEY` como fallback global del servidor.

La integracion usa el esquema oficial de OpenRouter con header `Authorization: Bearer <OPENROUTER_API_KEY>`.

## Settings de DeepSeek

DeepSeek si mantiene pantalla de settings en la app:

1. Abre `/settings`.
2. Ingresa la API key de DeepSeek.
3. La key se cifra y se guarda del lado servidor en el almacenamiento configurado de Agora. En Docker queda en `/app/data/.agora`.

Como alternativa, tambien puedes definir `DEEPSEEK_API_KEY` como fallback global del servidor.

Referencias oficiales:

- https://github.com/github/copilot-sdk/tree/main/docs/auth/index.md
- https://github.com/github/copilot-sdk/tree/main/docs/troubleshooting/debugging.md

## Variables utiles

- AGORA_PROVIDER_SETTINGS_KEY: clave maestra opcional para cifrar settings de proveedor en el servidor.
- AGORA_STORAGE_DIR: ruta opcional para persistir los settings cifrados del servidor. En Docker se usa `/app/data/.agora`.
- OPENROUTER_API_KEY: fallback global para OpenRouter.
- DEEPSEEK_API_KEY: fallback global para catalogo de DeepSeek.
- COPILOT_CLI_PATH: ruta opcional al binario de Copilot CLI si no puede resolverse automaticamente.
- PORT: puerto HTTP del servidor.

## Verificacion

```bash
npm run typecheck
```
