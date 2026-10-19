# Pieza: Flutter

App móvil en Flutter 3.41 (Dart 3.11). El mismo código se usa de dos formas:

- **Vista previa en Docker** (servicio `movil`, en `MOVIL_PORT`): se compila la versión web con la imagen oficial `ghcr.io/cirruslabs/flutter:3.41.3` y se sirve con nginx. Sirve para probarla desde icase-tool.
- **App real:** se ejecuta en el celular o el emulador con el Flutter instalado en la PC.

La imagen de Flutter pesa unos 7 GB: la primera vez que se levanta un proyecto con móvil tarda bastante más.

## Archivos fijos

- `movil/Dockerfile`, `movil/nginx.conf`, `movil/.dockerignore`;
- con Supabase, además, `movil/lib/config.dart` (dirección y clave pública, recibidas con `--dart-define`).

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `movil/pubspec.yaml` | `name`, `environment.sdk: ">=3.11.0 <4.0.0"`, dependencias (por ejemplo `supabase_flutter`, `sqflite`) |
| `movil/lib/main.dart` | Inicio de la app y navegación (del árbol de navegación, vista Móvil) |
| `movil/lib/pantallas/<pantalla>.dart` | Una pantalla por pantalla Móvil del prototipo |
| `movil/lib/**` | Servicios, modelos y widgets compartidos |

No hace falta generar las carpetas de plataforma (`android/`, `ios/`, `web/`): las crea `flutter create`.

## Reglas para el código generado

- Supabase se inicializa con `Supabase.initialize(url: supabaseUrl, publishableKey: supabaseAnonKey)` usando `config.dart` (`anonKey` está obsoleto).
- El código debe pasar `flutter analyze` sin errores.
- **Almacenamiento local (SQLite):** `sqflite` funciona en Android e iOS, pero no en la vista previa web. Si el diseño pide modo sin conexión, el acceso a SQLite va detrás de una interfaz, con una implementación en memoria para web, para que la vista previa compile. El modo sin conexión se prueba en el celular o el emulador.
- **Firebase (notificaciones) y Google Maps** necesitan, además de las claves, la configuración del proyecto de Firebase (`google-services.json` en Android). Sin ella la app abre, pero esas funciones avisan que falta configuración.

## Ejecutar la app real

Dentro de `movil/`, la primera vez:

```bash
flutter create --platforms=android,ios .
```

Después:

```bash
flutter run --dart-define=SUPABASE_URL=http://<IP de la PC>:<SUPABASE_PORT> --dart-define=SUPABASE_ANON_KEY=<ANON_KEY del .env>
```

- En el emulador de Android, la PC es `10.0.2.2`.
- En un celular real, la PC y el celular deben estar en la misma red, y el firewall de Windows debe permitir el puerto.
- Compilar para iPhone requiere una Mac.
