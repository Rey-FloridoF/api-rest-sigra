import { TDocumentDefinitions } from "pdfmake/interfaces";
import * as fs from "fs";
import * as path from "path";

export const daylyReport = (resultado: any): TDocumentDefinitions => {

    const { fecha, opciones, empleados, totalPorOpcion } = resultado;

    const fechaFormateada = new Date(fecha).toISOString().split('T')[0];

    // 🔹 Cargar imágenes
    const logoSigraPath = path.join(process.cwd(), 'src/assets/logo_sigra.png');
    const logoDcballosPath = path.join(process.cwd(), 'src/assets/logotipo_dcballos.jpg');

    const logoSigraBase64 = fs.readFileSync(logoSigraPath).toString('base64');
    const logoDcballosBase64 = fs.readFileSync(logoDcballosPath).toString('base64');

    // 🔹 Encabezado dinámico
    const headerRow: any[] = [
        { text: 'Empleado', bold: true }
    ];

    opciones.forEach((op: any) => {
        headerRow.push({
            text: op.nombre,
            bold: true,
            alignment: 'center'
        });
    });

    const bodyTable: any[] = [headerRow];

    if (empleados.length === 0) {

        bodyTable.push([
            {
                text: 'No existen reservas para este día',
                colSpan: opciones.length + 1,
                alignment: 'center',
                italics: true,
                margin: [0, 10, 0, 10]
            },
            ...Array(opciones.length).fill({})
        ]);

    } else {

        empleados.forEach((emp: any) => {

            const row: any[] = [
                emp.nombre
            ];

            opciones.forEach((op: any) => {
                row.push({
                    text: emp.opciones[op.id]?.toString() || '0',
                    alignment: 'center'
                });
            });

            bodyTable.push(row);
        });

        // 🔹 Fila de totales
        const totalRow: any[] = [
            { text: 'Totales', bold: true }
        ];

        opciones.forEach((op: any) => {
            totalRow.push({
                text: totalPorOpcion[op.id]?.toString() || '0',
                bold: true,
                alignment: 'center'
            });
        });

        bodyTable.push(totalRow);
    }

    return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: [

            // 🔹 Encabezado con logos
            {
                table: {
                    widths: ['*', '*'],
                    body: [[
                        {
                            image: `data:image/png;base64,${logoSigraBase64}`,
                            width: 120,
                            alignment: 'left'
                        },
                        {
                            image: `data:image/jpeg;base64,${logoDcballosBase64}`,
                            width: 120,
                            alignment: 'right'
                        }
                    ]]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 20]
            },

            // 🔹 Título
            {
                text: 'Reporte diario de reservas del comedor',
                alignment: 'center',
                bold: true,
                fontSize: 14,
                margin: [0, 0, 0, 15]
            },

            // 🔹 Día
            {
                text: `Día: ${fechaFormateada}`,
                margin: [0, 0, 0, 20]
            },

            // 🔹 Tabla
            {
                table: {
                    headerRows: 1,
                    widths: [
                        '*',
                        ...Array(opciones.length).fill(60)
                    ],
                    body: bodyTable
                },
                layout: 'lightHorizontalLines'
            },

            { text: '\n\n\n' },

            // 🔹 Firma
            {
                text: '______________\nResponsable'
            }

        ]
    };
};