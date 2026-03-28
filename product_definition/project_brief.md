# Idea

Esta aplicación se basa en que el usuario describe algo que quiere hacer y un grupo de expertos (modelos de IA) debate, encuentra la mejor solución y, finalmente, genera los documentos solicitados.

La aplicación dispone de foros de discusión que funcionan como chats donde ocurren los debates. El usuario inicia creando un nuevo foro; al hacerlo, se muestra lo siguiente:

- Primero, selecciona cuántos agentes IA desea (de 2 a 5).
- Según los agentes seleccionados, asigna a cada agente el modelo de IA que lo controlará; esta lista de modelos se detalla más adelante. A cada agente también se le asigna un nombre y un color (icono de persona sin género). Hay un selector de color para cada agente.
- Además, hay un área de texto donde el usuario explica la idea y lo que quiere lograr con el debate. En este campo hay un tooltip que indica qué debe incluirse y, adicionalmente, los documentos que desea que se generen.
- Un botón «Enviar» que envía todo lo anterior para ser procesado por la IA; este botón incluye una confirmación para evitar envíos accidentales.

Después de esta pantalla, un agente de IA que actúa como moderador lee el texto ingresado por el usuario, analiza el contenido y determina si la idea es suficientemente clara para debatir o si hay puntos que necesitan aclaración. En caso de dudas, el moderador crea un listado completo de preguntas necesarias para clarificar el entendimiento. Para cada pregunta se añaden posibles respuestas y una opción abierta para escribir. Siempre debe marcarse una respuesta como la más clara, aunque las demás sigan siendo opciones válidas.

Si existen preguntas, se muestran en la siguiente pantalla junto con un stepper que indica el total de preguntas y las ya respondidas. Para cada pregunta se muestran las opciones predefinidas y la opción de respuesta libre; el usuario debe seleccionar una opción o escribir su respuesta. Hay un botón «Siguiente» por cada pregunta.

Cuando se contestan todas las preguntas, aparece un botón de «Enviar» con confirmación. Esto regresa al moderador, que revisa el texto original, las preguntas y las respuestas, y evalúa si es necesario plantear nuevas preguntas, iniciando una nueva ronda de preguntas y respuestas como se describió anteriormente.

Solo se permiten un máximo de 3 rondas de preguntas y respuestas; por lo tanto, las preguntas deben ser suficientes para entender lo que desea el usuario y la documentación a generar.

Una vez completada la fase de preguntas y respuestas —o si desde el principio no hubo preguntas— el moderador toma toda la información y crea un documento de entendimiento del problema que recoge lo que los agentes debatirán para lograr la solución y, finalmente, los documentos requeridos.

Además, se debe definir un system prompt común que se usará para todos los agentes y que debe incluir:

- Rol e identidad: quién debe ser la IA y qué tono debe usar.
- Tarea principal: cuál es su misión u objetivo central.
- Contexto y reglas: qué información debe considerar y qué límites no debe cruzar.
- Restricciones: prohibiciones específicas (qué NO hacer o decir).
- Formato de salida: siempre Markdown.
- Flujo de trabajo: los pasos lógicos que debe seguir antes de responder.
- Manejo de excepciones: qué responder si no sabe algo o si la petición es inválida.

Se presenta al usuario el documento de entendimiento y el listado de todos los agentes nuevamente, con su nombre, el icono del color seleccionado y la IA asignada. El system prompt es común a todos los agentes: la idea es que los diferentes modelos debatan según sus capacidades, y no por diferencias en las instrucciones iniciales.

El usuario puede ajustar todos los componentes de la pantalla. Finalmente, hay un botón de «Enviar» muy notorio que, tras una confirmación, inicia el debate y que no podrá detenerse hasta su finalización (salvo por las opciones de pausa/stop descritas más abajo).

Cuando el usuario acepta, entonces:

1. El moderador realiza una ronda de lluvia de ideas. Selecciona aleatoriamente el orden de intervención de los agentes e indica que están en la fase de lluvia de ideas, pidiéndoles aportar propuestas para resolver el problema y sugerir cómo deben ser los documentos finales. En cada turno, los agentes leen el documento de entendimiento y las aportaciones previas, y luego comentan, critican y proponen mejoras. Tras una ronda, el moderador evalúa los puntos todavía en desacuerdo y propone una segunda ronda. Las rondas continúan hasta lograr consenso entre las partes.

   Es importante que el moderador, en cada ronda, impulse a los agentes a cerrar los temas pendientes. En cada ronda todos los agentes deben participar de forma aleatoria, sin repetirse el turno. El orden por ronda se reinicia y varía. El moderador deberá procurar un máximo de 5 rondas de lluvia de ideas; si se supera la quinta, a partir de esa ronda forzará el cierre de los puntos aún en debate y propondrá acuerdos que los agentes confirmarán o rechazarán. Cuando los puntos estén claros y exista acuerdo, se continúa con la siguiente fase.

2. Al terminar la fase de lluvia de ideas, el moderador crea un documento final con las ideas acordadas en esa fase. Luego genera un listado de los documentos a crear, ordenados por importancia según su criterio.

   A continuación, selecciona de forma aleatoria a los agentes para que creen los documentos de manera colaborativa, siguiendo el documento de entendimiento y el de lluvia de ideas. Se trabaja documento por documento hasta cerrarlo y continuar con el siguiente.

   Para cada documento final, el primer agente seleccionado escribe un borrador inicial. Luego comienzan rondas de ajustes: el siguiente agente toma el documento, lo completa o modifica según corresponda y deja comentarios para que los demás comprendan los cambios. Esto se repite hasta que todos los agentes hayan intervenido en una primera ronda; el autor inicial volverá a intervenir como crítico del documento. Finalizada la ronda, el moderador revisa el documento, detecta comentarios contradictorios y propone temas a resolver en la siguiente ronda. Las rondas continúan hasta llegar a acuerdos.

   El moderador debe procurar que los agentes cierren los temas pendientes y que el documento quede terminado en no más de 5 rondas; si se supera la quinta ronda, el moderador forzará el cierre definitivo de las secciones del documento.

   En cada ronda, los agentes dejan comentarios en el documento y también escriben en la conversación principal un resumen de lo que hicieron, qué ajustes aplicaron y qué comentarios dejaron.

Cuando un documento es marcado como cerrado por el moderador porque ya no hay más discusiones, se continúa con el siguiente documento. Las rondas por documento continúan hasta completar toda la documentación solicitada inicialmente por el usuario.

Al terminar todos los documentos, el debate finaliza y el proceso se marca como completado.

Aunque los debates y rondas son automáticos y el usuario no participa activamente, existe un botón de pausa y otro de stop para el proceso completo; esto actúa como un mecanismo de escape si el usuario considera que no se está llegando a acuerdos y el moderador no logra cerrarlos.

Para las fases y rondas debe haber un componente tipo stepper que dé visibilidad al usuario sobre en qué parte del proceso se encuentra.

Todos los documentos que escriben los agentes deben estar únicamente en Markdown.

Por cada foro de discusión hay una carpeta de trabajo donde se almacenan las discusiones y los documentos en Markdown.

Cada foro de discusión mantiene un registro (log) con las participaciones del moderador y de los agentes.

Además, la aplicación debe poder visualizar los Markdown formateados a HTML para que el usuario los vea. Este visor también muestra todos los comentarios dejados por los agentes en los documentos y, como los comentarios están asociados a la parte del documento donde se realizaron, también se muestran en la sección o párrafo correspondiente.

Al final, se pueden exportar todos los documentos Markdown en un ZIP; estos archivos exportados serán las versiones finales, sin comentarios de los agentes.

### Reglas importantes

**El moderador nunca debate ni toma decisiones sobre la solución o la estructura de los documentos; su responsabilidad es facilitar que la discusión fluya, cerrar fases, evitar estancamientos y forzar a que los agentes lleguen a acuerdos sobre cómo resolver la problemática, la estructura y el contenido de los documentos.**

Todos los diálogos que se muestran después de pulsar «Enviar» deben centrarse vertical y horizontalmente y aplicar un efecto de blur al contenido subyacente.

### Información técnica de la aplicación

- Todo el código y la documentación de la aplicación están escritos en inglés.
- La app permite seleccionar el idioma; inicialmente estará en español o inglés.
- Soporta modo oscuro y modo claro.

- La aplicación está pensada para ejecutarse en un servidor doméstico (home server), por lo que no hay restricciones fuertes de concurrencia ni exposiciones públicas a Internet.

- La interfaz debe ser moderna e intuitiva.
- Debe estar creada en Next.js y Tailwind CSS.
- Para la IA se podrá usar Copilot SDK, OpenRouter o DeepSeek; al seleccionar el proveedor, se muestra el grupo (Copilot SDK, OpenRouter o DeepSeek) y luego el modelo de IA.

- Por ejemplo, para Copilot se deben mostrar los modelos disponibles y el costo relativo (1x, 3x, 0.33x, 0x).
- Para OpenRouter se muestran los modelos con su precio por tokens de entrada y salida.
- Para DeepSeek se muestran sus modelos (actualmente 2) y el precio por tokens de entrada y salida.
- Para los tres grupos debe mostrarse, si es posible, las ventanas de contexto de cada modelo para input y output.

- Las opciones de idioma y tema (oscuro o claro) estarán representadas por dos botones con iconos sencillos y pequeños en la parte superior derecha de la pantalla.

- La aplicación debe poder desplegarse con Docker Compose y usar un volumen para preservar la información.
- La aplicación se expondrá por el puerto 7575.
