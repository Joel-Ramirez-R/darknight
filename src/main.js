import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

import darkSkyData from "../darksky_mexico.json";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";


// ==========================================
// 1. CREAR MAPA
// ==========================================

const map = L.map("map").setView(
    [23.6345, -102.5528],
    5
);


// ==========================================
// 2. MAPA BASE OSCURO
// ==========================================

const baseMap = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: "Tiles © Esri",
        maxZoom: 16
    }
);

baseMap.addTo(map);


// ==========================================
// 3. ANALIZAR DATOS
// ==========================================

const maxBrightness = darkSkyData.reduce(
    (max, point) =>
        Math.max(max, point.SkyBrightness),
    0
);

console.log(
    "Puntos:",
    darkSkyData.length
);

console.log(
    "SkyBrightness máximo:",
    maxBrightness
);


// ==========================================
// 4. NORMALIZAR SKY BRIGHTNESS
// ==========================================

const brightnessValues = darkSkyData
    .map(point => point.SkyBrightness)
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);


// ==========================================
// PERCENTIL
// ==========================================

function percentile(array, p) {

    const index =
        (array.length - 1) * p;

    const lower =
        Math.floor(index);

    const upper =
        Math.ceil(index);

    if (lower === upper) {
        return array[lower];
    }

    return (
        array[lower] +
        (array[upper] - array[lower]) *
        (index - lower)
    );
}


// ==========================================
// PUNTOS DE REFERENCIA
// ==========================================

const p50 =
    percentile(
        brightnessValues,
        0.50
    );

const p95 =
    percentile(
        brightnessValues,
        0.95
    );


console.log("P50:", p50);
console.log("P95:", p95);


// ==========================================
// 5. INTENSIDAD
// ==========================================

function getBrightnessIntensity(value) {

    let intensity =
        (value - p50) /
        (p95 - p50);

    return Math.max(
        0,
        Math.min(
            1,
            intensity
        )
    );
}


// ==========================================
// 6. CREAR HEAT DATA
// ==========================================

const heatData =
    darkSkyData.map(point => {

        const intensity =
            getBrightnessIntensity(
                point.SkyBrightness
            );

        return [
            point.Latitud,
            point.Longitud,
            intensity
        ];
    });


// ==========================================
// 7. CREAR HEATMAP
// ==========================================

const darkSkyLayer =
    L.heatLayer(
        heatData,
        {

            radius: 18,

            blur: 25,

            maxZoom: 8,

            minOpacity: 0.10,

            gradient: {

                0.00:
                    "rgba(7, 26, 61, 0)",

                0.20:
                    "rgba(11, 61, 145, 0.12)",

                0.40:
                    "rgba(20, 120, 200, 0.20)",

                0.55:
                    "rgba(0, 180, 180, 0.28)",

                0.65:
                    "rgba(50, 210, 120, 0.35)",

                0.75:
                    "rgba(150, 220, 60, 0.45)",

                0.85:
                    "rgba(240, 220, 50, 0.55)",

                0.93:
                    "rgba(255, 150, 30, 0.65)",

                1.00:
                    "rgba(255, 50, 30, 0.75)"
            }
        }
    );

darkSkyLayer.addTo(map);


// ==========================================
// 8. ÍNDICE ESPACIAL
// ==========================================

const gridSize = 0.05;

const spatialGrid =
    new Map();


darkSkyData.forEach(point => {

    const x =
        Math.floor(
            point.Longitud /
            gridSize
        );

    const y =
        Math.floor(
            point.Latitud /
            gridSize
        );

    const key =
        `${x}_${y}`;


    if (
        !spatialGrid.has(key)
    ) {

        spatialGrid.set(
            key,
            []
        );
    }


    spatialGrid
        .get(key)
        .push(point);

});


// ==========================================
// 9. BUSCAR PUNTO MÁS CERCANO
// ==========================================

function findNearestPoint(
    lat,
    lng
) {

    const x =
        Math.floor(
            lng /
            gridSize
        );

    const y =
        Math.floor(
            lat /
            gridSize
        );


    let nearestPoint =
        null;

    let minDistance =
        Infinity;


    for (
        let dx = -1;
        dx <= 1;
        dx++
    ) {

        for (
            let dy = -1;
            dy <= 1;
            dy++
        ) {

            const key =
                `${x + dx}_${y + dy}`;


            const points =
                spatialGrid.get(key);


            if (!points) {
                continue;
            }


            for (
                const point of points
            ) {

                const distance =

                    Math.pow(
                        point.Latitud - lat,
                        2
                    )

                    +

                    Math.pow(
                        point.Longitud - lng,
                        2
                    );


                if (
                    distance <
                    minDistance
                ) {

                    minDistance =
                        distance;

                    nearestPoint =
                        point;
                }
            }
        }
    }


    return nearestPoint;
}


// ==========================================
// 10. COLOR SEGÚN SKY BRIGHTNESS
// ==========================================

function getBrightnessColor(
    value
) {

    const intensity =
        getBrightnessIntensity(
            value
        );


    if (
        intensity < 0.15
    ) {

        return "#2b1055";

    }


    if (
        intensity < 0.30
    ) {

        return "#3155a6";

    }


    if (
        intensity < 0.50
    ) {

        return "#20b96b";

    }


    if (
        intensity < 0.70
    ) {

        return "#d8df32";

    }


    if (
        intensity < 0.85
    ) {

        return "#ff9d00";

    }


    return "#ff2200";
}


// ==========================================
// 11. LISTA DE ESTADOS
// ==========================================

const archivosEstados = {

    "01": "01_Aguascalientes.json",

    "02": "02_BajaCalifornia.json",

    "03": "03_BajaCaliforniaSur.json",

    "04": "04_Campeche.json",

    "05": "05_Coahuila.json",

    "06": "06_Colima.json",

    "07": "07_Chiapas.json",

    "08": "08_Chihuahua.json",

    "09": "09_CDMX.json",

    "10": "10_Durango.json",

    "11": "11_Guanajuato.json",

    "12": "12_Guerrero.json",

    "13": "13_Hidalgo.json",

    "14": "14_Jalisco.json",

    "15": "15_Mexico.json",

    "16": "16_Michoacan.json",

    "17": "17_Morelos.json",

    "18": "18_Nayarit.json",

    "19": "19_Nuevo_Leon.json",

    "20": "20_Oaxaca.json",

    "21": "21_Puebla.json",

    "22": "22_Queretaro.json",

    "23": "23_QuintanaRoo.json",

    "24": "24_SanLuisPotosi.json",

    "25": "25_Sinaloa.json",

    "26": "26_Sonora.json",

    "27": "27_Tabasco.json",

    "28": "28_Tamaulipas.json",

    "29": "29_Tlaxcala.json",

    "30": "30_Veracruz.json",

    "31": "31_Yucatan.json",

    "32": "32_Zacatecas.json"

};


// ==========================================
// 12. CACHE DE MUNICIPIOS
// ==========================================

const municipiosCache =
    new Map();


// ==========================================
// 13. CARGAR TODOS LOS ESTADOS
// ==========================================

async function cargarTodosLosMunicipios() {

    console.log(
        "Cargando municipios de México..."
    );


    const estados =
        Object.entries(
            archivosEstados
        );


    const resultados =
        await Promise.all(

            estados.map(
                async ([codigo, archivo]) => {

                    try {

     //                   const response =
     //                       await fetch(
     //                           `/municipios/${archivo}`
     //                       );

     const response =
    await fetch(
        `${import.meta.env.BASE_URL}municipios/${archivo}`
    );

                        if (!response.ok) {

                            console.error(
                                "No se pudo cargar:",
                                archivo
                            );

                            return null;
                        }


                        const data =
                            await response.json();


                        municipiosCache.set(
                            codigo,
                            data
                        );


                        console.log(
                            `Estado ${codigo} cargado`
                        );


                        return data;

                    }

                    catch (error) {

                        console.error(
                            `Error cargando ${archivo}:`,
                            error
                        );

                        return null;
                    }

                }
            )

        );


    const cargados =
        resultados.filter(
            data => data !== null
        ).length;


    console.log(
        `Municipios cargados: ${cargados}/32`
    );


    return cargados;
}


// ==========================================
// 14. BUSCAR MUNICIPIO
// ==========================================

function getMunicipio(
    lat,
    lng
) {

    const cursorPoint =
        turfPoint([
            lng,
            lat
        ]);


    for (
        const [codigo, geojson]
        of municipiosCache
    ) {

        if (
            !geojson ||
            !geojson.features
        ) {
            continue;
        }


        for (
            const feature
            of geojson.features
        ) {

            try {

                if (
                    booleanPointInPolygon(
                        cursorPoint,
                        feature
                    )
                ) {

                    const properties =
                        feature.properties || {};


                    return {

                        estado:
                            properties.NAME_1 ||
                            properties.name_1 ||
                            properties.NOMGEO ||
                            properties.NOMBRE ||
                            "Estado desconocido",

                        municipio:
                            properties.NAME_2 ||
                            properties.name_2 ||
                            properties.NOM_MUN ||
                            properties.NOMGEO ||
                            properties.NOMBRE ||
                            "Municipio desconocido"

                    };

                }

            }

            catch (error) {

                console.error(
                    "Error analizando municipio:",
                    error
                );

            }

        }

    }


    return {

        estado:
            "Estado desconocido",

        municipio:
            "Municipio desconocido"

    };

}


// ==========================================
// 15. CREAR TOOLTIP
// ==========================================

const tooltip =
    L.tooltip({

        sticky: true,

        direction: "top",

        offset: [
            0,
            -10
        ]

    });


// ==========================================
// 16. TOOLTIP CON EL CURSOR
// ==========================================

map.on(
    "mousemove",
    function(event) {

        const point =
            findNearestPoint(
                event.latlng.lat,
                event.latlng.lng
            );


        if (!point) {
            return;
        }


        const ubicacion =
            getMunicipio(
                event.latlng.lat,
                event.latlng.lng
            );


        const brightnessColor =
            getBrightnessColor(
                point.SkyBrightness
            );


        const intensity =
            getBrightnessIntensity(
                point.SkyBrightness
            );


        tooltip

            .setLatLng(
                event.latlng
            )

            .setContent(`

                <div class="tooltip-card">


                    <div class="tooltip-title">

                        🌌 DARKNIGTH

                    </div>


                    <div class="tooltip-divider"></div>


                    <div class="tooltip-label">

                        SKY BRIGHTNESS

                    </div>


                    <div class="tooltip-value-row">

                        <span
                            class="brightness-dot"
                            style="
                                background:
                                ${brightnessColor};

                                box-shadow:
                                0 0 10px
                                ${brightnessColor};
                            "
                        ></span>


                        <span
                            class="tooltip-value"
                        >

                            ${point.SkyBrightness.toFixed(4)}

                        </span>

                    </div>


                    <div
                        class="tooltip-gradient"
                    ></div>


                    <div
                        class="tooltip-scale"
                    >

                        <span>
                            Oscuro
                        </span>

                        <span>
                            Luminoso
                        </span>

                    </div>


                    <div
                        class="tooltip-level"
                    >

                        Intensidad relativa:

                        <strong>
                            ${(intensity * 100).toFixed(1)}%
                        </strong>

                    </div>


                    <div class="tooltip-label">

                        UBICACIÓN

                    </div>


                    <div
                        class="tooltip-coordinates"
                    >

                        ${ubicacion.estado}

                        <br>

                        ${ubicacion.municipio}

                    </div>


                    <div class="tooltip-label">

                        COORDENADAS

                    </div>


                    <div
                        class="tooltip-coordinates"
                    >

                        ${point.Latitud.toFixed(4)}°,
                        ${point.Longitud.toFixed(4)}°

                    </div>


                    <div
                        class="tooltip-footer"
                    >

                        Valor correspondiente al
                        punto más cercano.

                    </div>


                </div>

            `)

            .addTo(map);

    }
);


// ==========================================
// 17. OCULTAR TOOLTIP AL SALIR
// ==========================================

map.getContainer()
    .addEventListener(
        "mouseleave",
        () => {

            if (
                map.hasLayer(
                    tooltip
                )
            ) {

                map.removeLayer(
                    tooltip
                );

            }

        }
    );


// ==========================================
// 18. CARGAR MUNICIPIOS
// ==========================================

cargarTodosLosMunicipios();
