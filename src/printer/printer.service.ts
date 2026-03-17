import { Injectable } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as path from 'path';

@Injectable()
export class PrinterService {
  private pdfmake: any;

  constructor() {
    this.pdfmake = require('pdfmake');
    const fonts: any = {
      Roboto: {
        normal: path.join(
          process.cwd(),
          'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf',
        ),
        bold: path.join(
          process.cwd(),
          'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf',
        ),
        italics: path.join(
          process.cwd(),
          'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf',
        ),
        bolditalics: path.join(
          process.cwd(),
          'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf',
        ),
      },
    };
    this.pdfmake.addFonts(fonts);
  }

  async createPdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdf = this.pdfmake.createPdf(docDefinition);
        const chunks: Buffer[] = [];

        pdf.pdfDocumentPromise
          .then((doc: any) => {
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => {
              const buffer = Buffer.concat(chunks);
              resolve(buffer);
            });
            doc.on('error', reject);
            doc.end();
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}
