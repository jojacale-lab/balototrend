export async function handler() {
  try {
    const url = "https://baloto.com/resultados?page=1";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();

    const texto = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const regex = /(\d{1,2} de [A-Za-zÁÉÍÓÚáéíóú]+ de \d{4})\s+(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})/g;

    const resultados = [];
    let match;

    while ((match = regex.exec(texto)) !== null) {
      resultados.push({
        fecha: match[1],
        numeros: [
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6])
        ],
        superbalota: Number(match[7])
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fuente: "baloto.com/resultados",
        total: resultados.length,
        resultados
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "No se pudieron obtener los resultados.",
        detalle: error.message
      })
    };
  }
}