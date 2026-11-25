# Mapa del código

Dónde está cada funcionalidad de Soccer Manager. Las rutas parten de `soccer-manager/src/main/java/co/edu/soccermanager/`.

Toda petición sigue el mismo camino: **controller → service → repository → modelo**. El controller recibe la petición, el service aplica las reglas, el repository guarda en MongoDB y el modelo es la clase con los datos.

## Funcionalidades

| Funcionalidad | Archivo | Método | Líneas |
|---|---|---|---|
| Estudiantes de un grupo para tomar asistencia | `controller/GrupoController.java` → `service/GrupoService.java` → `repository/EstudianteRepository.java` | `listarEstudiantes` → `findByGrupoIdAndEstado` | 40-43 → 48-51 → 16 |
| Registrar asistencia | `controller/AsistenciaController.java` → `service/AsistenciaService.java` | `registrar` | 46-47 → 59-84 |
| El estudiante debe ser del grupo del entrenamiento | `service/AsistenciaService.java` | `registrar` | 74-76 |
| No repetir asistencia | `service/AsistenciaService.java` | `registrar` | 77-79 |
| Matricular estudiante | `controller/EstudianteController.java` → `service/EstudianteService.java` | `crear` | 41 → 54 |
| Menor de edad con acudiente | `service/EstudianteService.java` | `validarAcudientes` | 160-166 |
| Edad del estudiante | `modelo/Estudiante.java` | `calcularEdad`, `esMenorDeEdad` | 28-34 |
| Asignar grupo y revisar cupo | `service/EstudianteService.java` + `modelo/Grupo.java` | `asignarGrupo` + `tieneCupo` | 99-128 + 33 |
| Categoría según la edad | `service/EstudianteService.java` + `modelo/Categoria.java` | `validarCategoria` + `aplicaPara` | 171-175 + 34 |
| Permisos del entrenador | `controller/EntrenadorController.java` → `service/EntrenadorService.java` | `cambiarPermisos` | 50 → 65-70 |
| Registrar pago | `controller/MensualidadController.java` → `service/MensualidadService.java` → `modelo/Mensualidad.java` | `registrarPago` | 46-47 → 69-91 → 64 |
| Valor a pagar, saldo y estado | `modelo/Mensualidad.java` | `getValorAPagar`, `getSaldo`, `getEstado` | 33, 47, 51 |
| Programar entrenamiento | `service/EntrenamientoService.java` | `crear`, `validarHorario` | 51, 119-130 |
| Convocar a un partido | `service/ConvocatoriaService.java` | `convocar` | 67-104 |
| Evaluaciones | `service/EvaluacionService.java` + `modelo/Evaluacion.java` | `crear`, `publicar`, `calificacionesValidas` | 51, 79 + 38 |
| Notificaciones | `service/NotificacionService.java` | `notificar`, `notificarEstudianteYAcudientes`, `notificarGrupo` | 66, 71, 79 |
| Inicio de sesión | `controller/UsuarioController.java` → `service/UsuarioService.java` | `iniciarSesion` | 47 → 84-97 |
| Persistencia | `repository/*Repository.java` y `@Document` en cada modelo | `save`, `findById` (de `MongoRepository`) | ej. `Estudiante.java` 10 |
| Conexión a MongoDB | `src/main/resources/application.properties` | `spring.data.mongodb.uri` | — |
| Validaciones comunes | `service/Validacion.java` | `texto`, `presente`, `persona` | 15, 21, 27 |
| Manejo de errores | `controller/ManejadorExcepciones.java` + carpeta `excepcion` | `manejarNegocio` | 21-22 |
| Lista de estudiantes | `controller/EstudianteController.java` → `service/EstudianteService.java` | `listar` | 31 → 43 |
| Pruebas | `src/test/java/co/edu/soccermanager/` | `EstudianteServiceTest`, `EstudianteControllerTest` | — |

## Recorrido: registrar asistencia (`POST /api/asistencias`)

1. `AsistenciaController.registrar` recibe el JSON y llama al service.
2. `AsistenciaService.registrar` valida los campos (60-64) y busca la actividad (65). Si la actividad está cancelada responde 409 (66-68) y si aún no empieza, 400 (69-71).
3. Busca el estudiante, o responde 404 si no existe (72-73). El estudiante debe ser del grupo del entrenamiento (74-76) y no puede tener ya una asistencia en esa actividad (77-79).
4. `asistenciaRepository.save` guarda en la colección `asistencias` (83).
5. Si algo falla, `ManejadorExcepciones` responde `{"error": "..."}` con el código HTTP de la excepción.

## Recorrido: registrar pago (`POST /api/mensualidades/{id}/pagos`)

1. `MensualidadController.registrarPago` recibe el valor, el método y el comprobante.
2. `MensualidadService.registrarPago` revisa el método (70) y el valor (71-73). Si el pago es por transferencia exige el comprobante (74-76). Responde 409 si la mensualidad ya está pagada (77-80) y 400 si el pago supera el saldo (81-83).
3. `Mensualidad.registrarPago` crea el `Pago` (64). El saldo y el estado se recalculan solos.
4. Se guarda (85) y se notifica al estudiante y a sus acudientes (87-90).

## Patrones GRASP

| Patrón | Dónde |
|---|---|
| Experto | `Mensualidad.getSaldo()`, `Grupo.tieneCupo()`, `Categoria.aplicaPara()`, `Estudiante.esMenorDeEdad()` |
| Creador | `Mensualidad.registrarPago()` crea el `Pago` |
| Controlador | Los `*Controller` reciben y delegan, sin reglas |
| Bajo acoplamiento | Los controllers dependen de `IXService`, por ejemplo `EstudianteController` línea 29 |
| Alta cohesión | Un service por entidad |
| Polimorfismo | `Actividad.getDescripcion()` en `Entrenamiento` y `Partido`; `getEstadoHttp()` en cada excepción |
| Indirección / Fabricación pura | `*Repository`, `NotificacionService`, `Validacion`, `ManejadorExcepciones` |
