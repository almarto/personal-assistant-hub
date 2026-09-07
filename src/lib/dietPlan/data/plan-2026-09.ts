import type { DietPlan, Meal, ProfileId } from "../types";

/**
 * Plan semanal · 8 semanas · "Comer bien. Entrenar con cabeza."
 * Fuente: PDF entregado por el usuario (plan_semanal_alberto_patri).
 * Transcrito literalmente: cantidades, kcal, proteína, series, descansos y
 * tempos son los del documento. No se ha inventado ningún número salvo lo
 * marcado explícitamente como `source: "estimated"` en la lista de la compra.
 */

function meal(
  slot: Meal["slot"],
  title: string,
  albertoQty: string,
  patriQty: string,
  albertoMacros: { kcal: number; proteinG: number },
  patriMacros: { kcal: number; proteinG: number },
): Meal {
  return {
    slot,
    title,
    quantities: { alberto: albertoQty, patri: patriQty },
    macros: { alberto: albertoMacros, patri: patriMacros },
  };
}

export const DIET_PLAN_2026_09: DietPlan = {
  id: "plan-2026-09",
  name: "Comer bien. Entrenar con cabeza.",
  subtitle: "Guía diaria de Alberto y Patri",
  durationWeeks: 8,

  profiles: {
    alberto: {
      profileId: "alberto",
      displayName: "Alberto",
      dailyTarget: { kcal: 2250, proteinG: 180, fatG: 70, carbsG: 225 },
      expectedWeeklyProgressKg: [0.6, 0.8],
      expectedWeeklyProgressLabel: "0,6-0,8 kg/semana",
      supplementsNote:
        "Creatina monohidrato 3-5 g/día. Omega-3 mediante pescado azul 2 veces/semana. Vitamina D, pendiente de la próxima analítica.",
    },
    patri: {
      profileId: "patri",
      displayName: "Patri",
      dailyTarget: { kcal: 2100, proteinG: 130, fatG: 70, carbsG: 235 },
      expectedWeeklyProgressKg: [0.3, 0.4],
      expectedWeeklyProgressLabel: "0,3-0,4 kg/semana",
      supplementsNote: "Ninguno por ahora.",
    },
  },

  days: {
    monday: {
      weekday: "monday",
      label: "Lunes",
      trainingSessionId: "monday-lower-a",
      meals: [
        meal(
          "breakfast",
          "Tostadas con tomate rallado, aguacate, pavo y queso cottage. Café con leche.",
          "90 g pan integral + 120 g queso cottage + 50 g pavo + 30 g aguacate + 150 ml leche",
          "120 g pan + 50 g queso cottage + 20 g pavo + 30 g aguacate + 150 ml leche",
          { kcal: 520, proteinG: 39 },
          { kcal: 490, proteinG: 29 },
        ),
        meal(
          "lunch",
          "Pollo al pimentón con arroz y verduras: 200 g calabacín/pimiento/cebolla + 10 g AOVE. Taper.",
          "220 g pechuga + 80 g arroz",
          "150 g pechuga + 90 g arroz",
          { kcal: 720, proteinG: 62 },
          { kcal: 650, proteinG: 43 },
        ),
        meal(
          "snack",
          "Batido de proteína y fruta; llevar el polvo separado y mezclar al tomar.",
          "25 g whey + 250 ml leche + 70 g plátano + 14 g nueces",
          "15 g whey + 250 ml leche + 120 g plátano + 18 g nueces",
          { kcal: 370, proteinG: 31 },
          { kcal: 400, proteinG: 23 },
        ),
        meal(
          "dinner",
          "Merluza en airfryer, patata gajo y ensalada de tomate/pepino (200 g) con 10 g AOVE. 1 onza de chocolate.",
          "250 g merluza + 300 g patata",
          "180 g merluza + 350 g patata",
          { kcal: 635, proteinG: 51 },
          { kcal: 555, proteinG: 35 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2245, proteinG: 183, fatG: 69, carbsG: 222 },
        patri: { kcal: 2095, proteinG: 130, fatG: 70, carbsG: 234 },
      },
    },

    tuesday: {
      weekday: "tuesday",
      label: "Martes",
      trainingSessionId: "tuesday-upper-a",
      meals: [
        meal(
          "breakfast",
          "Tostadas con tortilla francesa, tomate rallado y aguacate. Café con leche.",
          "90 g pan integral + 2 huevos + 120 g claras + 30 g aguacate + 150 ml leche",
          "110 g pan + 2 huevos + 50 g claras + 30 g aguacate + 150 ml leche",
          { kcal: 555, proteinG: 40 },
          { kcal: 545, proteinG: 29 },
        ),
        meal(
          "lunch",
          "Albóndigas de pavo al tomate con cuscús: carne 5% grasa, salsa casera de tomate/cebolla/zanahoria 180 g y 10 g AOVE. Taper.",
          "230 g pavo + 75 g cuscús",
          "160 g pavo + 90 g cuscús",
          { kcal: 700, proteinG: 61 },
          { kcal: 660, proteinG: 43 },
        ),
        meal(
          "snack",
          "Crema de arroz con proteína y canela; llevar en taper y tomar fría o calentar 60-90 s.",
          "48 g crema de arroz + 30 g whey + 200 ml leche",
          "52 g crema de arroz + 24 g whey + 200 ml leche",
          { kcal: 390, proteinG: 35 },
          { kcal: 380, proteinG: 26 },
        ),
        meal(
          "dinner",
          "Salteado Mambo/sartén de ternera, noodles y verduras (200 g), soja baja en sal y 10 g aceite.",
          "200 g ternera magra + 70 g noodles",
          "130 g ternera + 85 g noodles",
          { kcal: 610, proteinG: 47 },
          { kcal: 520, proteinG: 32 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2255, proteinG: 183, fatG: 71, carbsG: 224 },
        patri: { kcal: 2105, proteinG: 130, fatG: 70, carbsG: 237 },
      },
    },

    wednesday: {
      weekday: "wednesday",
      label: "Miércoles",
      trainingSessionId: "wednesday-cardio-core",
      meals: [
        meal(
          "breakfast",
          "Tostadas con tomate, atún al natural y aguacate. Café con leche.",
          "100 g pan integral + 100 g atún escurrido + 50 g aguacate + 150 ml leche",
          "120 g pan + 40 g atún + 65 g aguacate + 150 ml leche",
          { kcal: 535, proteinG: 39 },
          { kcal: 525, proteinG: 28 },
        ),
        meal(
          "lunch",
          "Pasta integral con boloñesa de ternera y lentejas: 120 g salsa de tomate/verduras + 10 g AOVE. Taper.",
          "180 g ternera 5% + 100 g lentejas cocidas + 75 g pasta",
          "110 g ternera + 100 g lentejas + 90 g pasta",
          { kcal: 735, proteinG: 60 },
          { kcal: 675, proteinG: 41 },
        ),
        meal(
          "snack",
          "Queso fresco batido con fruta y almendras, en taper.",
          "300 g queso fresco batido 0% + 150 g fruta + 20 g almendras",
          "250 g queso fresco batido 0% + 200 g fruta + 27 g almendras",
          { kcal: 375, proteinG: 31 },
          { kcal: 410, proteinG: 24 },
        ),
        meal(
          "dinner",
          "Tortilla de patata ligera: patata y cebolla hechas en airfryer, cuajada en sartén; ensalada 200 g con 10 g AOVE.",
          "2 huevos + 220 g claras + 250 g patata",
          "2 huevos + 100 g claras + 320 g patata",
          { kcal: 595, proteinG: 50 },
          { kcal: 490, proteinG: 35 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2240, proteinG: 180, fatG: 70, carbsG: 223 },
        patri: { kcal: 2100, proteinG: 128, fatG: 70, carbsG: 236 },
      },
    },

    thursday: {
      weekday: "thursday",
      label: "Jueves",
      trainingSessionId: "thursday-lower-b",
      meals: [
        meal(
          "breakfast",
          "Tostadas con tomate, jamón serrano magro y queso cottage. Café con leche.",
          "90 g pan + 50 g jamón + 80 g queso cottage + 150 ml leche",
          "130 g pan + 20 g jamón + 30 g queso cottage + 5 g AOVE + 150 ml leche",
          { kcal: 525, proteinG: 39 },
          { kcal: 520, proteinG: 28 },
        ),
        meal(
          "lunch",
          "Salmón al limón, patata asada y brócoli (200 g), con 5 g AOVE. Taper.",
          "200 g salmón + 280 g patata",
          "140 g salmón + 360 g patata",
          { kcal: 740, proteinG: 50 },
          { kcal: 680, proteinG: 36 },
        ),
        meal(
          "snack",
          "Batido de proteína y fruta; llevar el polvo separado y mezclar al tomar.",
          "35 g whey + 250 ml leche + 70 g plátano + 12 g almendras",
          "22 g whey + 250 ml leche + 110 g plátano + 15 g almendras",
          { kcal: 400, proteinG: 39 },
          { kcal: 405, proteinG: 29 },
        ),
        meal(
          "dinner",
          "Fajitas de pollo: pimiento/cebolla 200 g, yogur-lima, 10 g AOVE.",
          "200 g pollo + 2 tortillas (120 g)",
          "130 g pollo + 2 tortillas (150 g)",
          { kcal: 595, proteinG: 52 },
          { kcal: 485, proteinG: 37 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2260, proteinG: 180, fatG: 71, carbsG: 226 },
        patri: { kcal: 2090, proteinG: 130, fatG: 69, carbsG: 233 },
      },
    },

    friday: {
      weekday: "friday",
      label: "Viernes",
      trainingSessionId: "friday-upper-b",
      meals: [
        meal(
          "breakfast",
          "Tostadas con aguacate, huevo y claras. Café con leche.",
          "80 g pan integral + 2 huevos + 160 g claras + 30 g aguacate + 150 ml leche",
          "110 g pan + 2 huevos + 50 g aguacate + 150 ml leche",
          { kcal: 550, proteinG: 42 },
          { kcal: 570, proteinG: 31 },
        ),
        meal(
          "lunch",
          "Lomo de cerdo, boniato y pimientos (200 g), 10 g AOVE, mostaza y romero. Taper.",
          "230 g lomo + 300 g boniato",
          "160 g lomo + 370 g boniato",
          { kcal: 710, proteinG: 61 },
          { kcal: 665, proteinG: 43 },
        ),
        meal(
          "snack",
          "Crema de arroz con proteína y canela; llevar en taper y tomar fría o recalentar.",
          "54 g crema de arroz + 20 g whey + 250 ml leche",
          "75 g crema de arroz + 10 g whey + 250 ml leche",
          { kcal: 395, proteinG: 28 },
          { kcal: 430, proteinG: 22 },
        ),
        meal(
          "dinner",
          "Pizza rápida con base de wrap, tomate, mozzarella, champiñón y jamón cocido. Ensalada 150 g con 5 g AOVE. 1 onza chocolate.",
          "2 wraps (120 g) + 100 g jamón + 100 g mozzarella light",
          "2 wraps (150 g) + 60 g jamón + 80 g mozzarella",
          { kcal: 590, proteinG: 50 },
          { kcal: 440, proteinG: 34 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2245, proteinG: 181, fatG: 70, carbsG: 224 },
        patri: { kcal: 2105, proteinG: 130, fatG: 70, carbsG: 236 },
      },
    },

    saturday: {
      weekday: "saturday",
      label: "Sábado",
      trainingSessionId: null,
      dayNote:
        "Cena fuera: la cena tiene un presupuesto, no una cifra exacta. Elegir un restaurante con carta visible y apuntar a un principal de proteína a la plancha/horno + patata/arroz + verdura; compartir un entrante; una bebida alcohólica como máximo. Evitar sumar a la vez pan, fritura, salsa cremosa, postre y varias copas. Si la cena supera el presupuesto, no compensar saltándose comidas al día siguiente; volver al plan y mirar el promedio semanal.",
      meals: [
        meal(
          "breakfast",
          "Tostadas con revuelto y tomate. Café con leche.",
          "70 g pan + 2 huevos + 180 g claras + 150 ml leche",
          "95 g pan + 2 huevos + 80 g claras + 150 ml leche",
          { kcal: 495, proteinG: 39 },
          { kcal: 485, proteinG: 28 },
        ),
        meal(
          "lunch",
          "Ensalada templada de quinoa, pollo, tomate, pepino y zanahoria (250 g), 10 g AOVE y limón.",
          "200 g pollo + 65 g quinoa",
          "130 g pollo + 85 g quinoa",
          { kcal: 630, proteinG: 58 },
          { kcal: 610, proteinG: 39 },
        ),
        meal(
          "snack",
          "Queso fresco batido con fruta y almendras, en taper.",
          "350 g queso fresco batido 0% + 70 g fruta + 15 g almendras",
          "250 g queso fresco batido 0% + 180 g fruta + 17 g almendras",
          { kcal: 330, proteinG: 30 },
          { kcal: 340, proteinG: 22 },
        ),
        {
          slot: "dinner",
          title:
            "Cena fuera. Presupuesto orientativo: principal + guarnición + verdura, y 1 cerveza de 330 ml o 1 copa de vino. Ejemplo: lubina/solomillo a la plancha, patata asada, ensalada, compartir entrante.",
          quantities: {
            alberto: "Objetivo cena: aprox. 795 kcal y 53 g P",
            patri: "Objetivo cena: aprox. 665 kcal y 41 g P",
          },
          macros: {
            alberto: { kcal: 795, proteinG: 53 },
            patri: { kcal: 665, proteinG: 41 },
          },
          isFlexible: true,
          flexibleNote:
            "Restaurante: no se compran ingredientes para esta comida.",
        },
      ],
      dailyTotal: {
        alberto: { kcal: 2250, proteinG: 180 },
        patri: { kcal: 2100, proteinG: 130 },
      },
    },

    sunday: {
      weekday: "sunday",
      label: "Domingo",
      trainingSessionId: null,
      dayNote:
        "Comida a domicilio: se reserva un margen realista para delivery. Para asegurar la segunda toma semanal de pescado azul, elegir poke de salmón con cantidad controlable, edamame, verduras y salsa aparte. Pescado azul de la semana: jueves (salmón al limón) y domingo (poke de salmón); así quedan cubiertas dos tomas sin suplemento de omega-3.",
      meals: [
        meal(
          "breakfast",
          "Tostadas con tomate, pavo, queso cottage y aguacate. Café con leche.",
          "100 g pan + 50 g pavo + 120 g queso cottage + 30 g aguacate + 150 ml leche",
          "130 g pan + 20 g pavo + 50 g queso cottage + 60 g aguacate + 150 ml leche",
          { kcal: 570, proteinG: 39 },
          { kcal: 560, proteinG: 28 },
        ),
        {
          slot: "lunch",
          title:
            "Poke de salmón: arroz, salmón, edamame, verduras, 1/2 aguacate compartido y salsa aparte.",
          quantities: {
            alberto: "220 g arroz cocido + 180 g salmón",
            patri: "280 g arroz cocido + 130 g salmón",
          },
          macros: {
            alberto: { kcal: 760, proteinG: 55 },
            patri: { kcal: 720, proteinG: 40 },
          },
          isFlexible: true,
          flexibleNote:
            "Por defecto se cocina en casa: sus ingredientes (salmón, arroz, edamame, verduras) se incluyen en la lista de la compra. También puede pedirse a domicilio.",
        },
        meal(
          "snack",
          "Queso fresco batido con fruta, nueces y una pieza de queso, en taper.",
          "250 g queso fresco batido 0% + 150 g fruta + 10 g nueces + 20 g queso",
          "200 g queso fresco batido 0% + 200 g fruta + 15 g nueces + 20 g queso",
          { kcal: 365, proteinG: 27 },
          { kcal: 385, proteinG: 20 },
        ),
        meal(
          "dinner",
          "Crema de calabacín en Mambo + tortilla francesa. 1 onza de chocolate. Crema: 300 g calabacín/puerro por persona y 10 g AOVE.",
          "3 huevos + 180 g claras + 40 g pan",
          "2 huevos + 100 g claras + 70 g pan",
          { kcal: 560, proteinG: 59 },
          { kcal: 440, proteinG: 42 },
        ),
      ],
      dailyTotal: {
        alberto: { kcal: 2255, proteinG: 180 },
        patri: { kcal: 2105, proteinG: 130 },
      },
    },
  },

  trainingSessions: {
    "monday-lower-a": {
      type: "strength",
      id: "monday-lower-a",
      weekday: "monday",
      label: "Lunes · Tren inferior A",
      exercises: [
        {
          name: "Sentadilla goblet",
          seriesReps: "4 × 12-18",
          restLabel: "90 s",
          tempo: "3-1-1-0",
          cue: "Mancuerna pegada al pecho; rodillas siguen la línea de los pies.",
        },
        {
          name: "Sentadilla búlgara",
          seriesReps: "3 × 12-16/lado",
          restLabel: "90 s",
          tempo: "3-1-1-0",
          cue: "Pie trasero en banco; rango estable, sin rebote.",
        },
        {
          name: "Peso muerto rumano con barra",
          seriesReps: "4 × 12-18",
          restLabel: "90 s",
          tempo: "3-1-1-1",
          cue: "Cadera atrás; barra cerca de las piernas.",
        },
        {
          name: "Elevación de gemelos de pie",
          seriesReps: "4 × 15-20",
          restLabel: "60 s",
          tempo: "3-1-1-2",
          cue: "Apoyo estable; pausa arriba y estiramiento controlado.",
        },
        {
          name: "Dead bug",
          seriesReps: "3 × 8-12/lado",
          restLabel: "45 s",
          tempo: "2-1-2-1",
          cue: "Zona lumbar pegada al suelo.",
        },
        {
          name: "Plancha lateral",
          seriesReps: "3 × 25-40 s/lado",
          restLabel: "45 s",
          tempo: "Isométrico",
          cue: "Cadera alta y cuerpo alineado.",
        },
      ],
    },

    "tuesday-upper-a": {
      type: "strength",
      id: "tuesday-upper-a",
      weekday: "tuesday",
      label: "Martes · Tren superior A",
      exercises: [
        {
          name: "Press banca con mancuernas",
          seriesReps: "4 × 12-18",
          restLabel: "90 s",
          tempo: "3-1-1-0",
          cue: "Agarre neutro o semineutro; no bajar más allá de un rango cómodo.",
        },
        {
          name: "Remo Pendlay con barra",
          seriesReps: "4 × 12-16",
          restLabel: "90 s",
          tempo: "2-1-1-1",
          cue: "Espalda firme; cada repetición sale desde el suelo.",
        },
        {
          name: "Press por encima de la cabeza, mancuernas",
          seriesReps: "3 × 12-16",
          restLabel: "75 s",
          tempo: "3-1-1-0",
          cue: "Sentado si ayuda; sin arquear la zona lumbar.",
        },
        {
          name: "Curl de bíceps alterno",
          seriesReps: "3 × 12-18/lado",
          restLabel: "60 s",
          tempo: "3-0-1-1",
          cue: "Codo quieto, bajada completa y controlada.",
        },
        {
          name: "Face pull con banda y anclaje de puerta",
          seriesReps: "3 × 15-20",
          restLabel: "60 s",
          tempo: "2-1-2-1",
          cue: "Tirar hacia la cara; separar manos al final.",
        },
      ],
    },

    "wednesday-cardio-core": {
      type: "cardio_core",
      id: "wednesday-cardio-core",
      weekday: "wednesday",
      label: "Miércoles · Cardio + core",
      cardio: {
        title: "Bicicleta · 35-40 min",
        warmupMinutes: 5,
        rounds: {
          count: 6,
          hardMinutes: 2,
          hardEffort: "7/10",
          easyMinutes: 3,
          easyEffort: "3-4/10",
        },
        cooldownMinutes: 5,
        totalMinutes: 40,
        shortAlternativeNote:
          "Si se empieza con 35 min, hacer 5 rondas en lugar de 6.",
        executionNote:
          "Elegir bicicleta estática o bici de carretera en rodillo. Pedaleo fluido, sin esprintar. Debe terminar con sensación de poder hacer otra ronda.",
      },
      core: [
        {
          name: "Pallof press con banda",
          seriesReps: "3 × 12-15/lado",
          restLabel: "30 s",
          tempo: "2-1-2-1",
          cue: "Resistir la rotación.",
        },
        {
          name: "Bird dog",
          seriesReps: "3 × 8-12/lado",
          restLabel: "30 s",
          tempo: "2-2-2-1",
          cue: "Pelvis estable.",
        },
        {
          name: "Plancha frontal",
          seriesReps: "3 × 25-45 s",
          restLabel: "45 s",
          tempo: "Isométrico",
          cue: "Glúteos y abdomen activos; cortar antes de perder postura.",
        },
      ],
      note: "Día fácil a propósito. No convertir los intervalos en una prueba. La prioridad es llegar recuperados al jueves.",
    },

    "thursday-lower-b": {
      type: "strength",
      id: "thursday-lower-b",
      weekday: "thursday",
      label: "Jueves · Tren inferior B",
      exercises: [
        {
          name: "Zancadas caminando",
          seriesReps: "4 × 12-16 pasos/lado",
          restLabel: "90 s",
          tempo: "3-1-1-0",
          cue: "Paso estable; torso alto; mancuernas a los lados.",
        },
        {
          name: "Hip thrust con espalda en banco",
          seriesReps: "4 × 15-20",
          restLabel: "90 s",
          tempo: "3-1-1-2",
          cue: "Barra acolchada; pausa fuerte arriba sin hiperextender.",
        },
        {
          name: "Peso muerto a una pierna, mancuerna",
          seriesReps: "3 × 12-16/lado",
          restLabel: "75 s",
          tempo: "3-1-1-1",
          cue: "Cadera cuadrada; apoyo ligero si mejora el equilibrio.",
        },
        {
          name: "Elevación de gemelos unilateral",
          seriesReps: "4 × 15-20/lado",
          restLabel: "60 s",
          tempo: "3-1-1-2",
          cue: "Rango completo y apoyo estable.",
        },
      ],
    },

    "friday-upper-b": {
      type: "strength",
      id: "friday-upper-b",
      weekday: "friday",
      label: "Viernes · Tren superior B",
      exercises: [
        {
          name: "Fondos en banco",
          seriesReps: "3 × 12-18",
          restLabel: "75 s",
          tempo: "3-1-1-0",
          cue: "Recorrido corto y hombros lejos de las orejas. Alberto: no profundizar; sustituir si molesta.",
        },
        {
          name: "Remo a una mano con mancuerna",
          seriesReps: "4 × 12-18/lado",
          restLabel: "75 s",
          tempo: "3-1-1-1",
          cue: "Apoyo en banco; llevar el codo hacia la cadera.",
        },
        {
          name: "Elevaciones laterales",
          seriesReps: "3 × 15-20",
          restLabel: "60 s",
          tempo: "3-1-1-0",
          cue: "Poco peso; parar antes de encoger hombros.",
        },
        {
          name: "Curl martillo",
          seriesReps: "3 × 12-18/lado",
          restLabel: "60 s",
          tempo: "3-0-1-1",
          cue: "Muñeca neutra, codo quieto.",
        },
        {
          name: "Curl de muñeca + extensión de muñeca",
          seriesReps: "3 × 15-20 de cada",
          restLabel: "45 s",
          tempo: "3-1-1-1",
          cue: "Antebrazos apoyados; recorrido controlado.",
        },
      ],
    },
  },

  warmup: {
    jumpRope:
      "Comba. Semanas 1-3: 3 min de saltos bajos, silenciosos y sin buscar velocidad. En Alberto, con 112 kg y tras 15 meses parado, el impacto es el principal riesgo: desde la semana 4 solo ampliar si tibias y Aquiles están bien. Patri puede alargar gradualmente desde el principio si se encuentra cómoda.",
    mobility:
      "Movilidad, 5-7 min. 6-8 repeticiones por lado de círculos de tobillo, balanceos de cadera, gato-vaca y rotaciones torácicas; después, 10 sentadillas sin carga y 10 bisagras de cadera.",
    approach:
      "Aproximación. Antes del primer ejercicio de fuerza, 2 series progresivas con poco peso, sin fatiga.",
    albertoShoulderCaution:
      "Hombro izquierdo de Alberto (cabeza larga del bíceps): controlar la carga y la bajada, favorecer excéntricos y usar un agarre cómodo. Evitar fondos profundos y press con agarre ancho si molesta. Dolor agudo, creciente o que cambia el gesto = parar ese ejercicio y sustituirlo por una variante indolora.",
  },

  blockRules: {
    weeks1to3:
      "Semanas 1-3: reconstrucción. Mantener siempre 2 repeticiones en recámara (RIR 2), nunca llegar al fallo y usar 3 segundos de bajada.",
    fromWeek4:
      "Desde la semana 4: subir poco a poco el trabajo, sin sacrificar técnica ni RIR. El límite de carga se compensa con 12-20 repeticiones, pausas, tempo lento y trabajo unilateral.",
    tempoExplanation:
      "Tempo: cuatro cifras = bajada · pausa abajo · subida · pausa arriba. Ejemplo: 3-1-1-0.",
    loadSelection:
      "Elegir una carga con la que el último bloque de repeticiones sea exigente, pero aún permita las repeticiones en reserva indicadas.",
  },

  progression: {
    weeks: [
      {
        week: 1,
        objective: "Volver a moverse",
        howToProgress: "Parte baja del rango; RIR 2; tempo 3 s. Anotar cargas y repeticiones.",
      },
      {
        week: 2,
        objective: "Repetir mejor",
        howToProgress: "Mantener carga y añadir 1 repetición por serie donde la técnica sea limpia.",
      },
      {
        week: 3,
        objective: "Consolidar",
        howToProgress: "Seguir sumando repeticiones hasta la zona alta, siempre RIR 2 y sin fallo.",
      },
      {
        week: 4,
        objective: "Primer escalón",
        howToProgress:
          "Si todas las series llegan al máximo con RIR 2, añadir la placa mínima disponible. Si no, mantener.",
      },
      {
        week: 5,
        objective: "Acumular",
        howToProgress: "Con la nueva carga, volver a 12-14 repeticiones y construir desde ahí.",
      },
      {
        week: 6,
        objective: "Más estímulo",
        howToProgress: "Añadir 1 serie solo al primer ejercicio de cada día si la recuperación es buena.",
      },
      {
        week: 7,
        objective: "Intensificar sin prisa",
        howToProgress:
          "Mantener RIR 1-2 en la última serie de cada ejercicio; el resto en RIR 2. Nunca al fallo.",
      },
      {
        week: 8,
        objective: "Semana de control",
        howToProgress:
          "Intentar superar la semana 7 por 1-2 repeticiones totales con igual técnica, o descargar un 25-30% de series si hay fatiga.",
      },
    ],
    whenPlateauSteps: [
      "Pasar a una variante unilateral o más difícil manteniendo seguridad.",
      "Alargar la bajada a 4-5 s y añadir una pausa de 2 s en el punto difícil.",
      "Usar 1,5 repeticiones: bajar, subir a mitad, volver a bajar y subir completa.",
      "Reducir el descanso 10-15 s, sin bajar de 45 s.",
      "Añadir una serie, con un máximo práctico de 5 por ejercicio.",
      "Usar bandas para sumar resistencia solo si el montaje es estable y el anclaje queda seguro.",
    ],
    equipmentNote:
      "El material permite unos 16-17 kg por mancuerna y unos 38 kg en la barra. No hace falta agotar todos los recursos a la vez: cambiar una sola variable y volver a progresar.",
  },

  shoppingList: [
    // Fruta y verdura
    { id: "patata", name: "Patata", category: "produce", quantityLabel: "2,0 kg", quantityValue: 2000, quantityUnit: "g", source: "pdf" },
    { id: "boniato", name: "Boniato", category: "produce", quantityLabel: "750 g", quantityValue: 750, quantityUnit: "g", source: "pdf" },
    { id: "calabacin", name: "Calabacín", category: "produce", quantityLabel: "1,4 kg", quantityValue: 1400, quantityUnit: "g", source: "pdf" },
    { id: "pimientos", name: "Pimientos variados", category: "produce", quantityLabel: "1,3 kg", quantityValue: 1300, quantityUnit: "g", source: "pdf" },
    { id: "cebolla", name: "Cebolla", category: "produce", quantityLabel: "1,0 kg", quantityValue: 1000, quantityUnit: "g", source: "pdf" },
    { id: "zanahoria", name: "Zanahoria", category: "produce", quantityLabel: "500 g", quantityValue: 500, quantityUnit: "g", source: "pdf" },
    { id: "brocoli", name: "Brócoli", category: "produce", quantityLabel: "450 g", quantityValue: 450, quantityUnit: "g", source: "pdf" },
    { id: "champinon", name: "Champiñón", category: "produce", quantityLabel: "250 g", quantityValue: 250, quantityUnit: "g", source: "pdf" },
    { id: "puerro", name: "Puerro", category: "produce", quantityLabel: "300 g", quantityValue: 300, quantityUnit: "g", source: "pdf" },
    { id: "tomate-fresco", name: "Tomate fresco", category: "produce", quantityLabel: "1,8 kg", quantityValue: 1800, quantityUnit: "g", source: "pdf" },
    { id: "pepino", name: "Pepino", category: "produce", quantityLabel: "2 unidades (500-600 g)", quantityUnit: "ud", source: "pdf" },
    { id: "hojas-lechuga", name: "Mezcla de hojas/lechuga, sin espinaca", category: "produce", quantityLabel: "600 g", quantityValue: 600, quantityUnit: "g", source: "pdf" },
    { id: "ajo", name: "Ajo", category: "produce", quantityLabel: "1 cabeza", quantityUnit: "ud", source: "pdf" },
    { id: "limones-limas", name: "Limones/limas", category: "produce", quantityLabel: "5 unidades", quantityUnit: "ud", source: "pdf" },
    { id: "platanos", name: "Plátanos", category: "produce", quantityLabel: "8-10 unidades", quantityUnit: "ud", source: "pdf" },
    { id: "fruta-meriendas", name: "Fruta variada para meriendas", category: "produce", quantityLabel: "2,0-2,2 kg", quantityValue: 2100, quantityUnit: "g", source: "pdf" },
    { id: "aguacates", name: "Aguacates", category: "produce", quantityLabel: "5 unidades", quantityUnit: "ud", source: "pdf" },
    { id: "hierbas", name: "Hierbas: perejil/cilantro", category: "produce", quantityLabel: "opcional", source: "pdf" },

    // Carne, pescado y huevos
    { id: "pechuga-pollo", name: "Pechuga de pollo", category: "meat_fish_eggs", quantityLabel: "1,35 kg", quantityValue: 1350, quantityUnit: "g", source: "pdf" },
    { id: "pavo-picado", name: "Carne picada de pavo 5%", category: "meat_fish_eggs", quantityLabel: "450 g", quantityValue: 450, quantityUnit: "g", source: "pdf" },
    { id: "ternera-magra", name: "Ternera magra 5%, picada + tiras", category: "meat_fish_eggs", quantityLabel: "700 g", quantityValue: 700, quantityUnit: "g", source: "pdf" },
    { id: "lomo-cerdo", name: "Lomo de cerdo limpio", category: "meat_fish_eggs", quantityLabel: "450 g", quantityValue: 450, quantityUnit: "g", source: "pdf" },
    { id: "salmon-jueves", name: "Salmón para el jueves", category: "meat_fish_eggs", quantityLabel: "400 g", quantityValue: 400, quantityUnit: "g", source: "pdf" },
    { id: "merluza", name: "Merluza", category: "meat_fish_eggs", quantityLabel: "500 g", quantityValue: 500, quantityUnit: "g", source: "pdf" },
    { id: "fiambre-pavo", name: "Fiambre de pavo alto % de carne", category: "meat_fish_eggs", quantityLabel: "400 g", quantityValue: 400, quantityUnit: "g", source: "pdf" },
    { id: "jamon-serrano", name: "Jamón serrano magro", category: "meat_fish_eggs", quantityLabel: "180 g", quantityValue: 180, quantityUnit: "g", source: "pdf" },
    { id: "jamon-cocido", name: "Jamón cocido alto % de carne", category: "meat_fish_eggs", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "atun-natural", name: "Atún al natural", category: "meat_fish_eggs", quantityLabel: "4 latas, unos 220 g escurridos", source: "pdf" },
    { id: "huevos", name: "Huevos", category: "meat_fish_eggs", quantityLabel: "30 unidades", quantityUnit: "ud", source: "pdf" },
    { id: "claras", name: "Claras pasteurizadas", category: "meat_fish_eggs", quantityLabel: "1,5 kg", quantityValue: 1500, quantityUnit: "g", source: "pdf" },

    // Lácteos y refrigerados
    { id: "leche", name: "Leche semidesnatada", category: "dairy_chilled", quantityLabel: "5 litros", quantityValue: 5000, quantityUnit: "ml", source: "pdf" },
    { id: "queso-fresco-batido", name: "Queso fresco batido 0%", category: "dairy_chilled", quantityLabel: "2 kg", quantityValue: 2000, quantityUnit: "g", source: "pdf" },
    { id: "queso-cottage", name: "Queso cottage", category: "dairy_chilled", quantityLabel: "500 g", quantityValue: 500, quantityUnit: "g", source: "pdf" },
    { id: "queso-pieza", name: "Queso en pieza para la merienda", category: "dairy_chilled", quantityLabel: "100 g", quantityValue: 100, quantityUnit: "g", source: "pdf" },
    { id: "queso-lonchas", name: "Queso en lonchas o rallado light", category: "dairy_chilled", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "mozzarella", name: "Mozzarella light", category: "dairy_chilled", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "yogur-natural", name: "Yogur natural para salsa", category: "dairy_chilled", quantityLabel: "2 unidades", quantityUnit: "ud", source: "pdf" },

    // Pan, cereales y legumbres
    { id: "pan-integral", name: "Pan integral (congelar rebanado)", category: "bread_grains_legumes", quantityLabel: "1,8 kg", quantityValue: 1800, quantityUnit: "g", source: "pdf" },
    { id: "wraps", name: "Tortillas integrales/wraps", category: "bread_grains_legumes", quantityLabel: "8-10 unidades, aprox. 600 g", quantityValue: 600, quantityUnit: "g", source: "pdf" },
    { id: "crema-arroz", name: "Crema de arroz", category: "bread_grains_legumes", quantityLabel: "300 g", quantityValue: 300, quantityUnit: "g", source: "pdf" },
    { id: "arroz-seco", name: "Arroz (seco)", category: "bread_grains_legumes", quantityLabel: "500 g seco", quantityValue: 500, quantityUnit: "g", source: "pdf" },
    { id: "pasta-integral", name: "Pasta integral", category: "bread_grains_legumes", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "cuscus", name: "Cuscús", category: "bread_grains_legumes", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "quinoa", name: "Quinoa", category: "bread_grains_legumes", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "noodles", name: "Noodles", category: "bread_grains_legumes", quantityLabel: "200 g", quantityValue: 200, quantityUnit: "g", source: "pdf" },
    { id: "lentejas", name: "Lentejas cocidas", category: "bread_grains_legumes", quantityLabel: "1 bote de 400 g, unos 240 g escurridos", quantityValue: 400, quantityUnit: "g", source: "pdf" },

    // Conservas, salsas y condimentos
    { id: "tomate-triturado", name: "Tomate triturado/passata", category: "pantry_condiments", quantityLabel: "3 botes de 400 g", source: "pdf" },
    { id: "soja-baja-sal", name: "Salsa de soja baja en sal", category: "pantry_condiments", quantityLabel: "1 botella", quantityUnit: "ud", source: "pdf" },
    { id: "mostaza", name: "Mostaza", category: "pantry_condiments", quantityLabel: "1 frasco pequeño", quantityUnit: "ud", source: "pdf" },
    { id: "whey", name: "Proteína whey", category: "pantry_condiments", quantityLabel: "250 g", quantityValue: 250, quantityUnit: "g", source: "pdf" },
    { id: "chocolate", name: "Chocolate negro 72%", category: "pantry_condiments", quantityLabel: "1 tableta", quantityUnit: "ud", source: "pdf" },
    { id: "almendras-nueces", name: "Almendras/nueces", category: "pantry_condiments", quantityLabel: "250 g", quantityValue: 250, quantityUnit: "g", source: "pdf" },
    { id: "aove", name: "AOVE", category: "pantry_condiments", quantityLabel: "500 ml", quantityValue: 500, quantityUnit: "ml", source: "pdf" },
    {
      id: "especias",
      name: "Especias",
      category: "pantry_condiments",
      quantityLabel: "surtido",
      note: "Pimentón, ajo en polvo, comino, orégano, romero, curry (opcional), canela, pimienta y sal.",
      source: "pdf",
    },

    // Para el fin de semana
    {
      id: "cerveza-vino",
      name: "Cerveza o vino para el fin de semana",
      category: "fin_de_semana",
      quantityLabel: "2 cervezas de 330 ml o una botella pequeña de vino",
      note: "No comprar ambas cosas si se quiere mantener el presupuesto calórico.",
      source: "pdf",
    },
    {
      id: "salmon-poke-domingo",
      name: "Salmón (extra, poke del domingo si se cocina en casa)",
      category: "fin_de_semana",
      quantityLabel: "350 g",
      quantityValue: 350,
      quantityUnit: "g",
      source: "pdf-note",
    },
    {
      id: "edamame-poke-domingo",
      name: "Edamame (poke del domingo)",
      category: "fin_de_semana",
      quantityLabel: "200 g",
      quantityValue: 200,
      quantityUnit: "g",
      source: "pdf-note",
    },
    {
      id: "arroz-poke-domingo",
      name: "Arroz cocido (poke del domingo)",
      category: "fin_de_semana",
      quantityLabel: "≈500 g cocido (220 g Alberto + 280 g Patri)",
      quantityValue: 500,
      quantityUnit: "g",
      note: "Reutiliza las cantidades de la tabla del domingo; el PDF no da una cifra propia de arroz en crudo para el poke.",
      source: "pdf-daily-table",
    },
    {
      id: "verduras-poke-domingo",
      name: "Verduras para el poke (domingo)",
      category: "fin_de_semana",
      quantityLabel: "≈400 g (200 g/persona)",
      quantityValue: 400,
      quantityUnit: "g",
      note: "Estimación nuestra: el PDF menciona \"verduras\" para el poke casero sin dar cantidad.",
      source: "estimated",
    },
  ],

  guidance: {
    howToReadPlan: [
      "Cantidades de arroz, pasta, cuscús, quinoa, avena, patata, carne y pescado: peso en crudo, salvo que se indique \"cocido\".",
      "Verdura: peso limpio. Aceite: pesado, no \"a ojo\".",
      "En cada comida toman la misma preparación; solo cambian las cantidades.",
      "Kcal y proteína son estimaciones realistas y pueden variar un 5-10% según la marca. Para ajustar con precisión, conviene registrar una vez las marcas habituales.",
      "El café del desayuno incluye la leche indicada.",
      "El chocolate es 1 onza de 10 g, 72% cacao.",
      "Las meriendas pueden llevarse en un taper o vaso hermético. Las frías se conservan con acumulador de frío; la crema de arroz puede comerse fría o recalentarse.",
    ],
    patriLactationNote:
      "Patri está dando el pecho por la noche. Este plan no debería convertirse en un déficit agresivo: si nota hambre intensa, cansancio o menor producción de leche, añadir 150-250 kcal, por ejemplo yogur natural, fruta y 15 g de nueces, y revisar el objetivo con una dietista-nutricionista o profesional sanitario.",
    oilyFishNote:
      "Pescado azul de la semana: jueves (salmón al limón) y domingo (poke de salmón). Así quedan cubiertas dos tomas de pescado azul con comida, sin suplemento de omega-3.",
    practicalAdjustments: [
      "Si una marca cambia de forma clara las cifras, ajustar primero 10-20 g de pan, crema de arroz o frutos secos, sin recortar la ración principal de proteína.",
      "Si el peso no evoluciona como se busca durante 2-3 semanas, revisar primero aceite, bebidas, salsas y cantidades reales del fin de semana.",
      "Las cifras del restaurante y del delivery son presupuestos. Una foto de la carta o la información nutricional permite recalcular sin convertir el fin de semana en una prohibición.",
    ],
    batchCookingSummary: [
      "Qué queda hecho: 5 comidas de lunes a viernes por persona (10 recipientes A/P y día), 5 meriendas de lunes a viernes por persona, y el pan/toppings del desayuno preparados para montar en pocos minutos.",
      "0:00-0:15 preparación general: horno a 210 °C, airfryer a 195 °C; lavar y cortar patata, boniato, pimientos/cebolla/calabacín y brócoli; etiquetar recipientes; rebanar y congelar el pan.",
      "0:15-0:55 primera tanda simultánea: horno (boniato+pimientos / patata+brócoli), airfryer (pollo del lunes, luego albóndigas del martes), Mambo (sofrito y boloñesa del miércoles), fuego auxiliar (arroz del lunes y cuscús del martes).",
      "0:55-1:35 segunda tanda simultánea: horno (salmón del jueves), airfryer (lomo del viernes), Mambo/olla (salsa de albóndigas y pasta), montaje de los 5 tapers según las cantidades del menú.",
      "1:35-1:55 meriendas: cocinar juntas las cremas de arroz de martes y viernes, preparar botes secos de whey y bolsitas de frutos secos, pesar el queso fresco batido del miércoles.",
      "1:55-2:20 desayunos, enfriado, etiquetado y limpieza: agrupar toppings por día, enfriar arroz/pasta/guarniciones en recipientes poco profundos, no dejar comida cocinada más de 2 horas a temperatura ambiente, etiquetar con nombre, A/P, fecha y nevera/congelador.",
    ],
    storageGuidance: [
      "Nevera (0-4 °C): comidas de lunes, martes y miércoles; consumir en 3 días. Crema de arroz y queso fresco batido: 2-3 días.",
      "Congelar el domingo: comidas de jueves y viernes en cuanto estén frías. Pasar cada taper a la nevera la noche anterior de consumirlo.",
      "Salmón: congelar la ración cocinada del jueves; pasar a la nevera el miércoles por la noche. Recalentar solo hasta que esté caliente para no resecarlo.",
      "Batidos: transportar el polvo seco y añadir leche fría al tomar. Si se lleva ya mezclado, usar botella hermética y acumulador de frío.",
      "Lácteos, fruta cortada, fiambre y queso: transportar siempre fríos. No dejarlos varias horas a temperatura ambiente.",
      "Descongelación en nevera, nunca todo el día a temperatura ambiente.",
      "Recalentado en microondas hasta que el centro esté bien caliente, removiendo a mitad. Al arroz, pasta o crema de arroz se le puede añadir una cucharada de agua o leche.",
      "Ensaladas, aguacate, tomate rallado, fruta cortada y salsas frías se añaden el mismo día.",
    ],
  },
};

export const ACTIVE_DIET_PLAN: DietPlan = DIET_PLAN_2026_09;

export type { DietPlan, ProfileId };
