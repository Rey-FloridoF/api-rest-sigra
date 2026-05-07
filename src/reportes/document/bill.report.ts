import { TDocumentDefinitions } from "pdfmake/interfaces";
import * as fs from "fs";
import * as path from "path";

export const billreport = (resultadoConsulta: any, fecha: string): TDocumentDefinitions => {

    const { fechaInicio, fechaFin, registros } = resultadoConsulta;

    const totalGeneral = registros.reduce(
        (acc: number, item: any) => acc + item.gasto,
        0
    );

    // 🔹 Cargar imágenes
    const logoSigraPath = path.join(process.cwd(), 'src/assets/logo_sigra.png');
    const logoDcballosPath = path.join(process.cwd(), 'src/assets/logotipo_dcballos.jpg');

    const logoSigraBase64 = fs.readFileSync(logoSigraPath).toString('base64');
    const logoDcballosBase64 = fs.readFileSync(logoDcballosPath).toString('base64');

    // 🔹 Construcción dinámica del body de la tabla
    const bodyTable: any[] = [
        [
            { text: '#', bold: true },
            { text: 'Nombre Completo', bold: true },
            { text: 'Username', bold: true },
            { text: 'Gastos', bold: true }
        ]
    ];

    if (registros.length === 0) {

        bodyTable.push([
            {
                text: 'No existen registros en el período seleccionado',
                colSpan: 4,
                alignment: 'center',
                italics: true,
                margin: [0, 10, 0, 10]
            },
            {}, {}, {}
        ]);

    } else {

        registros.forEach((item: any, index: number) => {
            bodyTable.push([
                index + 1,
                item.nombreCompleto,
                item.username,
                {
                    text: `$${item.gasto.toFixed(2)}`,
                    alignment: 'right'
                }
            ]);
        });

        bodyTable.push([
            {
                text: 'Total',
                colSpan: 3,
                alignment: 'right',
                bold: true
            },
            {},
            {},
            {
                text: `$${totalGeneral.toFixed(2)}`,
                bold: true,
                alignment: 'right'
            }
        ]);
    }

    return {
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
                text: 'Reporte de gastos del servicio del comedor',
                alignment: 'center',
                bold: true,
                fontSize: 14,
                margin: [0, 0, 0, 15]
            },

            // 🔹 Período
            {
                text: `Período: ${fechaInicio} al ${fechaFin}`,
                margin: [0, 0, 0, 20]
            },

            // 🔹 Tabla principal
            {
                table: {
                    widths: [30, '*', 100, 80],
                    body: bodyTable
                },
                layout: 'lightHorizontalLines'
            },

            { text: '\n\n\n' },

            {
                text: `______________\nResponsable\n Fecha del reporte${fecha}`,
                margin: [0, 20, 0, 0]
            }

        ]
    };
};