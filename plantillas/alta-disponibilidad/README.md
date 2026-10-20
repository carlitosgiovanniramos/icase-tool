# Pieza: alta disponibilidad

Se usa cuando la arquitectura pide servidor web master activo y esclavo en espera, con cambio automático.

- El servicio web de la pieza web (`altaDisponibilidad.servicio` en su `pieza.json`) se duplica en `<servicio>-master` y `<servicio>-esclavo`: misma app y misma configuración.
- El `balanceador` (nginx) publica el puerto web y envía todo al master. Si el master no responde, pasa la petición al esclavo (servidor `backup`) sin que el usuario lo note. Cuando el master vuelve, retoma el tráfico.
- Requiere que el servicio web tenga healthcheck.

No genera código: la IA no escribe nada en esta pieza.

**Alcance:** es alta disponibilidad del servidor web en una sola PC, para demostrar el comportamiento del diseño. La base de datos no se replica.
