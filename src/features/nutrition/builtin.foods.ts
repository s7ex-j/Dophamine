import type { Food, FoodState } from "@/src/features/nutrition/foods";

/**
 * Alimentos básicos incluidos en la app, para registrar sin red.
 *
 * Son ingredientes sueltos, no platos armados: un almuerzo se registra como sus
 * partes (arroz, pollo, palta), cada una con su peso. Los que cambian de peso al
 * cocinarse están dos veces, crudo y cocido, enlazados por una clave para poder
 * pasar de uno a otro: 100 g de arroz crudo no son 100 g de arroz cocido.
 *
 * Valores de referencia por 100 g de porción comestible, redondeados, tomados
 * de tablas de composición de uso general (USDA FoodData Central y tablas
 * peruanas de composición de alimentos). Son promedios: una marca o un corte
 * concreto puede diferir. Para un producto envasado, la etiqueta manda.
 *
 * Cada fila: [nombre, kcal, proteína, carbohidratos, grasas, gramos de una porción,
 * nombre de la porción, estado, clave del par crudo/cocido].
 * "cocido" = hervido, al vapor, al horno o a la plancha, sin grasa añadida.
 */
type Row = [string, number, number, number, number, number, string?, FoodState?, string?];
const R: FoodState = "raw";
const C: FoodState = "cooked";

const ROWS: Row[] = [
  // Aves
  ["Pechuga de pollo cruda, sin piel", 120, 22.5, 0, 2.6, 150, "filete", R, "pollo-pechuga"],
  ["Pechuga de pollo cocida, sin piel", 165, 31, 0, 3.6, 120, "filete", C, "pollo-pechuga"],
  ["Muslo de pollo crudo, sin piel", 121, 19.7, 0, 4.1, 120, "muslo", R, "pollo-muslo"],
  ["Muslo de pollo cocido, sin piel", 179, 24.8, 0, 8.2, 100, "muslo", C, "pollo-muslo"],
  ["Pierna de pollo cruda, con piel", 161, 18, 0, 9.5, 130, "pierna", R, "pollo-pierna"],
  ["Pierna de pollo cocida, con piel", 191, 23.3, 0, 10.2, 110, "pierna", C, "pollo-pierna"],
  ["Pechuga de pavo cruda", 114, 23.7, 0, 1.5, 120, "porción", R, "pavo-pechuga"],
  ["Pechuga de pavo cocida", 147, 30, 0, 2.1, 100, "porción", C, "pavo-pechuga"],

  // Res, cerdo y otras carnes
  ["Carne de res magra cruda", 143, 21.4, 0, 6, 150, "filete", R, "res-magra"],
  ["Carne de res magra cocida", 200, 29, 0, 8.5, 120, "filete", C, "res-magra"],
  ["Carne molida de res 90/10 cruda", 176, 20, 0, 10, 120, "porción", R, "res-molida-90"],
  ["Carne molida de res 90/10 cocida", 217, 26.1, 0, 11.7, 100, "porción", C, "res-molida-90"],
  ["Carne molida de res 80/20 cruda", 254, 17.2, 0, 20, 120, "porción", R, "res-molida-80"],
  ["Carne molida de res 80/20 cocida", 272, 25.5, 0, 18, 100, "porción", C, "res-molida-80"],
  ["Lomo de res crudo", 158, 21.5, 0, 7.5, 150, "filete", R, "res-lomo"],
  ["Lomo de res cocido", 211, 28, 0, 10, 120, "filete", C, "res-lomo"],
  ["Hígado de res crudo", 135, 20.4, 3.9, 3.6, 120, "porción", R, "res-higado"],
  ["Hígado de res cocido", 175, 26.5, 5.1, 4.7, 100, "porción", C, "res-higado"],
  ["Corazón de res crudo", 112, 17.7, 0.1, 3.9, 120, "porción", R, "res-corazon"],
  ["Corazón de res cocido", 165, 28.5, 0.2, 4.7, 100, "porción", C, "res-corazon"],
  ["Lomo de cerdo crudo", 143, 21, 0, 6, 150, "porción", R, "cerdo-lomo"],
  ["Lomo de cerdo cocido", 196, 27, 0, 9, 120, "porción", C, "cerdo-lomo"],
  ["Chuleta de cerdo cruda", 170, 20.5, 0, 9.5, 150, "chuleta", R, "cerdo-chuleta"],
  ["Chuleta de cerdo cocida", 231, 25.7, 0, 13.5, 120, "chuleta", C, "cerdo-chuleta"],
  ["Cordero crudo", 206, 19, 0, 14, 130, "porción", R, "cordero"],
  ["Cordero cocido", 258, 25.5, 0, 16.5, 100, "porción", C, "cordero"],
  ["Chicharrón de cerdo", 544, 61, 0, 31, 30, "porción"],
  ["Tocino frito", 541, 37, 1.4, 42, 16, "2 tiras"],
  ["Jamón cocido", 110, 17.5, 1.5, 3.5, 30, "2 lonjas"],
  ["Jamón de pavo", 104, 17, 2, 3, 30, "2 lonjas"],
  ["Salchicha tipo hot dog", 290, 10.5, 2.5, 26, 45, "unidad"],
  ["Chorizo", 455, 24, 2, 38, 60, "unidad"],

  // Pescados y mariscos
  ["Salmón crudo", 208, 20.4, 0, 13.4, 150, "filete", R, "salmon"],
  ["Salmón cocido", 206, 22, 0, 12.4, 120, "filete", C, "salmon"],
  ["Trucha cruda", 141, 19.9, 0, 6.2, 150, "filete", R, "trucha"],
  ["Trucha cocida", 168, 23.5, 0, 7.4, 120, "filete", C, "trucha"],
  ["Bonito crudo", 130, 23, 0, 4, 150, "filete", R, "bonito"],
  ["Bonito cocido", 150, 26, 0, 4.5, 120, "filete", C, "bonito"],
  ["Jurel crudo", 135, 20.5, 0, 5.5, 150, "filete", R, "jurel"],
  ["Jurel cocido", 155, 24, 0, 6, 120, "filete", C, "jurel"],
  ["Caballa cruda", 158, 20.1, 0, 7.9, 150, "filete", R, "caballa"],
  ["Caballa cocida", 205, 23.9, 0, 11.9, 120, "filete", C, "caballa"],
  ["Tilapia cruda", 96, 20, 0, 1.7, 150, "filete", R, "tilapia"],
  ["Tilapia cocida", 128, 26, 0, 2.7, 120, "filete", C, "tilapia"],
  ["Pescado blanco crudo (merluza, lenguado)", 82, 17.8, 0, 0.7, 150, "filete", R, "pescado-blanco"],
  ["Pescado blanco cocido (merluza, lenguado)", 105, 22, 0, 1.3, 120, "filete", C, "pescado-blanco"],
  ["Camarones o langostinos crudos", 85, 20, 0, 0.5, 120, "porción", R, "camarones"],
  ["Camarones o langostinos cocidos", 99, 24, 0.2, 0.3, 100, "porción", C, "camarones"],
  ["Pota o calamar crudo", 92, 15.6, 3.1, 1.4, 120, "porción", R, "pota"],
  ["Pota o calamar cocido", 105, 18, 3.5, 1.6, 100, "porción", C, "pota"],
  ["Atún en agua, escurrido", 116, 25.5, 0, 0.8, 100, "lata chica"],
  ["Atún en aceite, escurrido", 198, 29, 0, 8.2, 100, "lata chica"],
  ["Sardinas en aceite, escurridas", 208, 24.6, 0, 11.5, 90, "lata"],

  // Huevos y lácteos
  ["Huevo entero", 143, 12.6, 0.7, 9.5, 50, "unidad", R, "huevo"],
  ["Huevo duro", 155, 12.6, 1.1, 10.6, 50, "unidad", C, "huevo"],
  ["Huevo frito", 196, 13.6, 0.8, 15, 46, "unidad"],
  ["Clara de huevo", 52, 10.9, 0.7, 0.2, 33, "clara"],
  ["Yema de huevo", 322, 15.9, 3.6, 26.5, 17, "yema"],
  ["Leche entera", 61, 3.2, 4.8, 3.3, 240, "vaso"],
  ["Leche semidescremada", 50, 3.3, 4.8, 1.9, 240, "vaso"],
  ["Leche descremada", 34, 3.4, 5, 0.1, 240, "vaso"],
  ["Leche evaporada", 134, 6.8, 10, 7.6, 30, "2 cucharadas"],
  ["Leche condensada", 321, 7.9, 54.4, 8.7, 20, "cucharada"],
  ["Leche de soya sin azúcar", 33, 2.9, 1.7, 1.6, 240, "vaso"],
  ["Leche de almendras sin azúcar", 15, 0.6, 0.3, 1.2, 240, "vaso"],
  ["Yogur natural entero", 61, 3.5, 4.7, 3.3, 150, "vaso"],
  ["Yogur natural descremado", 56, 5.7, 7.7, 0.2, 150, "vaso"],
  ["Yogur griego natural descremado", 59, 10.2, 3.6, 0.4, 150, "vaso"],
  ["Yogur griego natural entero", 97, 9, 4, 5, 150, "vaso"],
  ["Yogur de fruta azucarado", 95, 3.5, 16, 1.5, 150, "vaso"],
  ["Queso fresco", 264, 18, 3, 20, 30, "tajada"],
  ["Queso mozzarella", 280, 28, 3.1, 17, 30, "tajada"],
  ["Queso cheddar", 403, 24.9, 1.3, 33.1, 30, "tajada"],
  ["Queso edam o gouda", 357, 25, 1.4, 27.8, 30, "tajada"],
  ["Queso parmesano", 431, 38, 4.1, 29, 10, "cucharada"],
  ["Queso crema", 342, 6, 4.1, 34, 15, "cucharada"],
  ["Requesón o ricotta", 174, 11.3, 3, 13, 60, "porción"],
  ["Queso cottage", 98, 11.1, 3.4, 4.3, 100, "porción"],
  ["Mantequilla", 717, 0.9, 0.1, 81, 10, "cucharadita"],
  ["Crema de leche", 340, 2.1, 2.8, 36, 15, "cucharada"],

  // Cereales y derivados
  ["Arroz blanco crudo", 365, 7.1, 80, 0.7, 60, "porción", R, "arroz-blanco"],
  ["Arroz blanco cocido", 130, 2.7, 28.2, 0.3, 160, "taza", C, "arroz-blanco"],
  ["Arroz integral crudo", 367, 7.5, 76.2, 3.2, 60, "porción", R, "arroz-integral"],
  ["Arroz integral cocido", 123, 2.7, 25.6, 1, 160, "taza", C, "arroz-integral"],
  ["Avena en hojuelas, cruda", 379, 13.2, 67.7, 6.5, 40, "media taza", R, "avena"],
  ["Avena cocida en agua", 71, 2.5, 12, 1.5, 240, "taza", C, "avena"],
  ["Quinua cruda", 368, 14.1, 64.2, 6.1, 45, "porción", R, "quinua"],
  ["Quinua cocida", 120, 4.4, 21.3, 1.9, 185, "taza", C, "quinua"],
  ["Fideos o pasta cruda", 371, 13, 74.7, 1.5, 80, "porción", R, "fideos"],
  ["Fideos o pasta cocida", 158, 5.8, 30.9, 0.9, 180, "plato", C, "fideos"],
  ["Trigo o mote crudo", 340, 12, 72, 2, 50, "porción", R, "trigo"],
  ["Trigo o mote cocido", 150, 5, 31, 0.8, 150, "porción", C, "trigo"],
  ["Kiwicha cruda", 371, 13.6, 65.2, 7, 30, "porción"],
  ["Pan francés", 277, 9, 56, 1.5, 35, "unidad"],
  ["Pan de molde blanco", 266, 8.9, 49.4, 3.3, 28, "tajada"],
  ["Pan de molde integral", 252, 12.5, 42.7, 3.5, 28, "tajada"],
  ["Pan ciabatta", 271, 9, 52, 3, 60, "unidad"],
  ["Tortilla de trigo", 310, 8, 51, 8, 45, "unidad"],
  ["Tortilla de maíz", 218, 5.7, 44.6, 2.9, 26, "unidad"],
  ["Galletas de soda", 430, 9, 71, 12, 26, "paquete"],
  ["Galletas dulces rellenas", 480, 5, 70, 20, 36, "paquete"],
  ["Cereal de maíz en hojuelas", 357, 7.5, 84, 0.4, 30, "taza"],
  ["Granola", 471, 10, 64, 20, 40, "porción"],
  ["Cancha serrana tostada", 400, 9, 66, 11, 30, "puñado"],
  ["Maíz pop sin mantequilla", 387, 12.9, 77.8, 4.5, 20, "2 tazas"],
  ["Harina de trigo", 364, 10.3, 76.3, 1, 30, "2 cucharadas"],

  // Tubérculos y raíces
  ["Papa blanca cruda", 77, 2, 17.5, 0.1, 170, "unidad mediana", R, "papa-blanca"],
  ["Papa blanca cocida", 87, 1.9, 20.1, 0.1, 150, "unidad mediana", C, "papa-blanca"],
  ["Papa amarilla cruda", 97, 2, 22, 0.1, 110, "unidad", R, "papa-amarilla"],
  ["Papa amarilla cocida", 103, 2, 23.5, 0.1, 100, "unidad", C, "papa-amarilla"],
  ["Camote crudo", 86, 1.6, 20.1, 0.1, 170, "unidad mediana", R, "camote"],
  ["Camote cocido", 90, 2, 20.7, 0.2, 150, "unidad mediana", C, "camote"],
  ["Yuca cruda", 160, 1.4, 38.1, 0.3, 120, "porción", R, "yuca"],
  ["Yuca cocida", 130, 1.1, 31, 0.2, 120, "porción", C, "yuca"],
  ["Choclo crudo", 86, 3.3, 19, 1.4, 100, "medio choclo", R, "choclo"],
  ["Choclo cocido", 96, 3.4, 21, 1.5, 100, "medio choclo", C, "choclo"],
  ["Plátano verde crudo", 122, 1.3, 31.9, 0.4, 130, "medio plátano", R, "platano-verde"],
  ["Plátano verde cocido", 116, 0.8, 31.2, 0.2, 120, "medio plátano", C, "platano-verde"],
  ["Papas fritas", 312, 3.4, 41.4, 14.7, 120, "porción"],
  ["Plátano frito (tajadas)", 267, 1.5, 41, 12, 80, "porción"],

  // Menestras
  ["Lentejas crudas", 352, 24.6, 63.4, 1.1, 60, "porción", R, "lentejas"],
  ["Lentejas cocidas", 116, 9, 20.1, 0.4, 200, "taza", C, "lentejas"],
  ["Frejoles crudos", 333, 23.6, 60, 0.8, 60, "porción", R, "frejoles"],
  ["Frejoles cocidos", 127, 8.7, 22.8, 0.5, 180, "taza", C, "frejoles"],
  ["Garbanzos crudos", 378, 20.5, 63, 6, 60, "porción", R, "garbanzos"],
  ["Garbanzos cocidos", 164, 8.9, 27.4, 2.6, 165, "taza", C, "garbanzos"],
  ["Pallares crudos", 338, 21.5, 63.4, 0.7, 60, "porción", R, "pallares"],
  ["Pallares cocidos", 115, 7.8, 20.9, 0.4, 170, "taza", C, "pallares"],
  ["Arvejas partidas crudas", 341, 24.6, 60.4, 1.2, 60, "porción", R, "arvejas-partidas"],
  ["Arvejas partidas cocidas", 118, 8.3, 21.1, 0.4, 195, "taza", C, "arvejas-partidas"],
  ["Habas secas crudas", 341, 26.1, 58.3, 1.5, 60, "porción", R, "habas"],
  ["Habas cocidas", 110, 7.6, 19.7, 0.4, 170, "taza", C, "habas"],
  ["Soya cruda", 446, 36.5, 30.2, 19.9, 60, "porción", R, "soya"],
  ["Soya cocida", 172, 18.2, 8.4, 9, 170, "taza", C, "soya"],
  ["Tarwi o chocho cocido", 151, 17.3, 9.5, 5.2, 100, "porción"],
  ["Tofu firme", 144, 17.3, 2.8, 8.7, 100, "porción"],
  ["Hummus", 166, 7.9, 14.3, 9.6, 30, "2 cucharadas"],

  // Frutas
  ["Plátano de seda", 89, 1.1, 22.8, 0.3, 120, "unidad"],
  ["Manzana", 52, 0.3, 13.8, 0.2, 180, "unidad"],
  ["Naranja", 47, 0.9, 11.8, 0.1, 180, "unidad"],
  ["Mandarina", 53, 0.8, 13.3, 0.3, 90, "unidad"],
  ["Papaya", 43, 0.5, 10.8, 0.3, 200, "tajada grande"],
  ["Piña", 50, 0.5, 13.1, 0.1, 160, "rodaja gruesa"],
  ["Mango", 60, 0.8, 15, 0.4, 200, "unidad chica"],
  ["Sandía", 30, 0.6, 7.6, 0.2, 280, "tajada"],
  ["Melón", 34, 0.8, 8.2, 0.2, 180, "tajada"],
  ["Uvas", 69, 0.7, 18.1, 0.2, 150, "racimo chico"],
  ["Fresas", 32, 0.7, 7.7, 0.3, 150, "taza"],
  ["Arándanos", 57, 0.7, 14.5, 0.3, 75, "media taza"],
  ["Pera", 57, 0.4, 15.2, 0.1, 180, "unidad"],
  ["Durazno", 39, 0.9, 9.5, 0.3, 150, "unidad"],
  ["Kiwi", 61, 1.1, 14.7, 0.5, 75, "unidad"],
  ["Granadilla", 94, 2.4, 21, 0.4, 100, "unidad"],
  ["Maracuyá, pulpa", 97, 2.2, 23.4, 0.7, 40, "unidad"],
  ["Chirimoya", 75, 1.6, 17.7, 0.7, 150, "porción"],
  ["Lúcuma, pulpa", 99, 1.5, 25, 0.5, 100, "porción"],
  ["Tuna (fruta)", 41, 0.7, 9.6, 0.5, 100, "unidad"],
  ["Aguaymanto", 53, 1.9, 11.2, 0.7, 100, "porción"],
  ["Limón, jugo", 22, 0.4, 6.9, 0.2, 15, "cucharada"],
  ["Palta", 160, 2, 8.5, 14.7, 70, "media unidad"],
  ["Aceitunas", 145, 1, 3.8, 15.3, 20, "5 unidades"],
  ["Pasas", 299, 3.1, 79.2, 0.5, 30, "puñado"],
  ["Dátiles", 282, 2.5, 75, 0.4, 24, "3 unidades"],
  ["Jugo de naranja natural", 45, 0.7, 10.4, 0.2, 240, "vaso"],

  // Verduras
  ["Tomate", 18, 0.9, 3.9, 0.2, 120, "unidad"],
  ["Lechuga", 15, 1.4, 2.9, 0.2, 50, "taza"],
  ["Cebolla", 40, 1.1, 9.3, 0.1, 110, "unidad"],
  ["Zanahoria cruda", 41, 0.9, 9.6, 0.2, 70, "unidad", R, "zanahoria"],
  ["Zanahoria cocida", 35, 0.8, 8.2, 0.2, 75, "media taza", C, "zanahoria"],
  ["Brócoli crudo", 34, 2.8, 6.6, 0.4, 90, "taza", R, "brocoli"],
  ["Brócoli cocido", 35, 2.4, 7.2, 0.4, 90, "taza", C, "brocoli"],
  ["Coliflor cruda", 25, 1.9, 5, 0.3, 100, "taza", R, "coliflor"],
  ["Coliflor cocida", 23, 1.8, 4.1, 0.5, 100, "taza", C, "coliflor"],
  ["Espinaca cruda", 23, 2.9, 3.6, 0.4, 30, "taza", R, "espinaca"],
  ["Espinaca cocida", 23, 3, 3.8, 0.3, 180, "taza", C, "espinaca"],
  ["Zapallo crudo", 26, 1, 6.5, 0.1, 120, "porción", R, "zapallo"],
  ["Zapallo cocido", 20, 0.7, 4.9, 0.1, 120, "porción", C, "zapallo"],
  ["Vainitas crudas", 31, 1.8, 7, 0.2, 110, "taza", R, "vainitas"],
  ["Vainitas cocidas", 35, 1.9, 7.9, 0.3, 125, "taza", C, "vainitas"],
  ["Betarraga cruda", 43, 1.6, 9.6, 0.2, 85, "unidad chica", R, "betarraga"],
  ["Betarraga cocida", 44, 1.7, 10, 0.2, 85, "unidad chica", C, "betarraga"],
  ["Pepino", 15, 0.7, 3.6, 0.1, 100, "media unidad"],
  ["Pimiento", 26, 1, 6, 0.3, 120, "unidad"],
  ["Zapallito italiano o zucchini", 17, 1.2, 3.1, 0.3, 120, "media unidad"],
  ["Arvejas verdes cocidas", 84, 5.4, 15.6, 0.2, 80, "media taza"],
  ["Col o repollo", 25, 1.3, 5.8, 0.1, 70, "taza"],
  ["Apio", 16, 0.7, 3, 0.2, 40, "tallo"],
  ["Champiñones", 22, 3.1, 3.3, 0.3, 70, "taza"],
  ["Espárragos cocidos", 22, 2.4, 4.1, 0.2, 90, "6 unidades"],
  ["Berenjena cocida", 35, 0.8, 8.7, 0.2, 100, "porción"],
  ["Alcachofa cocida", 53, 2.9, 11.9, 0.3, 120, "unidad"],
  ["Ajo", 149, 6.4, 33.1, 0.5, 3, "diente"],

  // Frutos secos, semillas y grasas
  ["Maní tostado", 585, 23.7, 21.5, 49.7, 30, "puñado"],
  ["Mantequilla de maní", 588, 25, 20, 50, 16, "cucharada"],
  ["Almendras", 579, 21.2, 21.6, 49.9, 28, "puñado"],
  ["Nueces", 654, 15.2, 13.7, 65.2, 28, "puñado"],
  ["Castañas o nueces de Brasil", 659, 14.3, 11.7, 67.1, 15, "3 unidades"],
  ["Pecanas", 691, 9.2, 13.9, 72, 28, "puñado"],
  ["Castañas de cajú", 553, 18.2, 30.2, 43.8, 28, "puñado"],
  ["Pistachos", 560, 20.2, 27.2, 45.3, 28, "puñado"],
  ["Semillas de chía", 486, 16.5, 42.1, 30.7, 12, "cucharada"],
  ["Linaza", 534, 18.3, 28.9, 42.2, 10, "cucharada"],
  ["Semillas de girasol", 584, 20.8, 20, 51.5, 15, "cucharada"],
  ["Ajonjolí", 573, 17.7, 23.4, 49.7, 9, "cucharada"],
  ["Coco rallado seco", 660, 6.9, 23.7, 64.5, 15, "2 cucharadas"],
  ["Aceite de oliva", 884, 0, 0, 100, 14, "cucharada"],
  ["Aceite vegetal", 884, 0, 0, 100, 14, "cucharada"],
  ["Aceite de coco", 862, 0, 0, 100, 14, "cucharada"],
  ["Margarina", 717, 0.2, 0.7, 80.7, 10, "cucharadita"],
  ["Mayonesa", 680, 1, 0.6, 75, 14, "cucharada"],

  // Azúcares, dulces y salsas
  ["Azúcar blanca", 387, 0, 100, 0, 5, "cucharadita"],
  ["Azúcar rubia", 380, 0.1, 98, 0, 5, "cucharadita"],
  ["Miel de abeja", 304, 0.3, 82.4, 0, 21, "cucharada"],
  ["Mermelada", 250, 0.4, 65, 0.1, 20, "cucharada"],
  ["Manjar blanco o dulce de leche", 315, 6.8, 55.4, 7.4, 20, "cucharada"],
  ["Chocolate de leche", 535, 7.7, 59.4, 29.7, 25, "barra chica"],
  ["Chocolate amargo 70 %", 598, 7.8, 45.9, 42.6, 25, "barra chica"],
  ["Cocoa en polvo sin azúcar", 228, 19.6, 57.9, 13.7, 5, "cucharada"],
  ["Helado de crema", 207, 3.5, 23.6, 11, 100, "bola grande"],
  ["Gelatina preparada", 62, 1.2, 14.2, 0, 120, "vaso"],
  ["Kétchup", 101, 1, 27.4, 0.1, 15, "cucharada"],
  ["Mostaza", 60, 3.7, 5.8, 3.3, 5, "cucharadita"],
  ["Salsa de soya o sillao", 53, 8.1, 4.9, 0.6, 15, "cucharada"],
  ["Salsa de tomate", 29, 1.3, 6.6, 0.2, 60, "porción"],
  ["Ají amarillo, pasta", 45, 1.5, 9, 0.6, 15, "cucharada"],

  // Bebidas
  ["Café negro sin azúcar", 1, 0.1, 0, 0, 240, "taza"],
  ["Té o infusión sin azúcar", 1, 0, 0.3, 0, 240, "taza"],
  ["Gaseosa regular", 42, 0, 10.6, 0, 355, "lata"],
  ["Gaseosa sin azúcar", 0, 0, 0, 0, 355, "lata"],
  ["Chicha morada con azúcar", 45, 0.1, 11.5, 0, 240, "vaso"],
  ["Bebida rehidratante", 26, 0, 6.4, 0, 500, "botella"],
  ["Bebida energizante", 45, 0, 11, 0, 250, "lata"],
  ["Agua de coco", 19, 0.7, 3.7, 0.2, 240, "vaso"],
  ["Cerveza", 43, 0.5, 3.6, 0, 355, "lata"],
  ["Vino tinto", 85, 0.1, 2.6, 0, 150, "copa"],
  ["Pisco o destilado 40°", 231, 0, 0, 0, 45, "medida"],
  ["Vino blanco", 82, 0.1, 2.6, 0, 150, "copa"],
  ["Cerveza sin alcohol", 21, 0.3, 4.5, 0, 355, "lata"],

  // Suplementos
  ["Proteína de suero en polvo", 400, 80, 8, 6, 30, "scoop"],
  ["Proteína vegetal en polvo", 380, 75, 8, 6, 30, "scoop"],
  ["Barra de proteína", 360, 33, 35, 11, 60, "barra"],
  ["Barra de cereal", 390, 6, 70, 10, 25, "barra"],
  ["Creatina monohidrato", 0, 0, 0, 0, 5, "dosis"],
];

// Gramos de alcohol por 100 g (≈ grados × 0.79). Sus calorías ya están en kcal.
const ALCOHOL: Record<string, number> = {
  Cerveza: 3.9,
  "Vino tinto": 10.6,
  "Vino blanco": 10.3,
  "Pisco o destilado 40°": 33.4,
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const BUILTIN_FOODS: Food[] = ROWS.map(
  ([name, kcal, proteinG, carbsG, fatsG, servingG, servingLabel, state, pair]): Food => ({
    id: `b:${slug(name)}`,
    source: "builtin",
    name,
    servingG,
    ...(servingLabel ? { servingLabel } : {}),
    ...(state ? { state } : {}),
    ...(pair ? { pair } : {}),
    per100: { kcal, proteinG, carbsG, fatsG, ...(ALCOHOL[name] ? { alcoholG: ALCOHOL[name] } : {}) },
  }),
);
