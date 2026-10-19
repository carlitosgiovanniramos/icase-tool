# Vista previa web de la app Flutter. La app real se ejecuta en el celular o el emulador con
# flutter run; este contenedor solo sirve para probarla desde el navegador.

# Etapa 1: compilación con la imagen de Flutter.
FROM ghcr.io/cirruslabs/flutter:3.41.3 AS compilacion
WORKDIR /app
COPY pubspec.* ./
RUN flutter pub get
COPY . .
# El código generado trae pubspec.yaml y lib/; la plataforma web se agrega aquí si falta.
RUN flutter create --platforms=web --project-name "$(grep '^name:' pubspec.yaml | awk '{print $2}')" . \
    && flutter pub get
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
RUN flutter build web --release \
      --dart-define=SUPABASE_URL=$SUPABASE_URL \
      --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Etapa 2: solo los archivos compilados, servidos por nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/build/web /usr/share/nginx/html
EXPOSE 80
