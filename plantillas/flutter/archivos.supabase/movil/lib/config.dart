// Dirección y clave pública de Supabase. Se pasan al compilar con --dart-define:
//   - vista previa en Docker: la arma el Dockerfile (localhost y el puerto de la puerta de entrada);
//   - celular o emulador: flutter run --dart-define=SUPABASE_URL=http://<IP de la PC>:<puerto> ...
//     (en el emulador de Android la PC es 10.0.2.2).
const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
