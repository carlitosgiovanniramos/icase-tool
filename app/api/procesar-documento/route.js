import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export async function POST(request) {
  try {
    const { url } = await request.json();

    const respuesta = await fetch(url);
    const buffer = Buffer.from(await respuesta.arrayBuffer());

    let texto = "";
    const urlMinuscula = url.toLowerCase();

    if (urlMinuscula.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const resultado = await parser.getText();
      texto = resultado.text;
      await parser.destroy();
    } else if (urlMinuscula.endsWith(".docx")) {
      const resultado = await mammoth.extractRawText({ buffer });
      texto = resultado.value;
    } else if (urlMinuscula.endsWith(".xlsx")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      texto = XLSX.utils.sheet_to_csv(hoja);
    } else {
      return NextResponse.json(
        { error: "Formato de documento no soportado" },
        { status: 400 }
      );
    }

    return NextResponse.json({ texto });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}