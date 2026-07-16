import { jsPDF } from "jspdf";

export async function exportReport(data, preview = false) {
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const {
    chartMaxX,
    testConfig,
    committente,
    cantiere,
    verbale,
    dataProva,
    km,
    sezione,
    quota,
    tecnico,
    presenti,
    diametro,
    md,
    mdp,
    rapporto,
    tableRows = [],
    fotoProva,
    firmaTecnico,
    chart1 = [],
    chartScarico1 = [],
    chart2 = [],
  } = data;

  const PW = 210;
  const PH = 297;

  const CONTENT_X = 10;
  const CONTENT_Y = 8;
  const CONTENT_W = 190;
  const CONTENT_H = 190;
  const CONTENT_RIGHT = CONTENT_X + CONTENT_W;
  const CONTENT_BOTTOM = CONTENT_Y + CONTENT_H;

  const layerLabel = String(testConfig?.label || "-").toUpperCase();
  const rows = Array.isArray(tableRows) ? tableRows : [];

  function section(x, y, w, title, h = 4.8) {
    pdf.setFillColor(235, 238, 242);
    pdf.setDrawColor(205, 208, 212);
    pdf.rect(x, y, w, h, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.4);
    pdf.setTextColor(25, 25, 25);
    pdf.text(title, x + 1.2, y + 3.15);

    return y + h;
  }

  function cell(x, y, w, h, label, value, options = {}) {
    const { align = "left", valueFontSize = 5.2 } = options;

    pdf.setDrawColor(188, 188, 188);
    pdf.rect(x, y, w, h);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(4.2);
    pdf.setTextColor(90, 90, 90);

    pdf.text(String(label || ""), x + 1, y + 2, {
      maxWidth: w - 2,
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(valueFontSize);
    pdf.setTextColor(0, 0, 0);

    const safeValue = String(value ?? "-");

    if (align === "center") {
      pdf.text(safeValue, x + w / 2, y + h - 1.15, {
        align: "center",
        maxWidth: w - 2,
      });
    } else {
      pdf.text(safeValue, x + 1, y + h - 1.15, {
        maxWidth: w - 2,
      });
    }
  }

  function drawTable(x, y, w) {
    const titleH = 4.8;
    const groupH = 4.1;
    const headH = 4.1;
    const rowH = 3.35;

    const cols = [20, 42, 42, 42, 44];
    const heads = ["kPa", "Lett.", "s", "Lett.", "s"];

    let cursor = section(
      x,
      y,
      w,
      `TABELLA LETTURE - ${layerLabel}`,
      titleH
    );

    pdf.setFillColor(232, 236, 241);
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(x, cursor, w, groupH, "FD");

    pdf.rect(x, cursor, cols[0], groupH);

    pdf.rect(
      x + cols[0],
      cursor,
      cols[1] + cols[2],
      groupH
    );

    pdf.rect(
      x + cols[0] + cols[1] + cols[2],
      cursor,
      cols[3] + cols[4],
      groupH
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(4.4);
    pdf.setTextColor(35, 35, 35);

    pdf.text(
      "CARICO",
      x + cols[0] / 2,
      cursor + 2.75,
      {
        align: "center",
      }
    );

    pdf.text(
      "1 CICLO",
      x + cols[0] + (cols[1] + cols[2]) / 2,
      cursor + 2.75,
      {
        align: "center",
      }
    );

    pdf.text(
      "2 CICLO",
      x +
        cols[0] +
        cols[1] +
        cols[2] +
        (cols[3] + cols[4]) / 2,
      cursor + 2.75,
      {
        align: "center",
      }
    );

    cursor += groupH;

    pdf.setFillColor(246, 246, 246);
    pdf.rect(x, cursor, w, headH, "F");

    let cx = x;

    heads.forEach((head, index) => {
      pdf.setDrawColor(210, 210, 210);
      pdf.rect(cx, cursor, cols[index], headH);

      pdf.text(
        head,
        cx + cols[index] / 2,
        cursor + 2.7,
        {
          align: "center",
        }
      );

      cx += cols[index];
    });

    cursor += headH;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.15);
    pdf.setTextColor(0, 0, 0);

    rows.forEach(({ p, r1, s1, r2, s2 }) => {
      cx = x;

      const values = [
        p,
        r1 !== null && r1 !== undefined
          ? Number(r1).toFixed(2)
          : "-",
        s1 !== null && s1 !== undefined
          ? Number(s1).toFixed(3)
          : "-",
        r2 !== null && r2 !== undefined
          ? Number(r2).toFixed(2)
          : "-",
        s2 !== null && s2 !== undefined
          ? Number(s2).toFixed(3)
          : "-",
      ];

      values.forEach((value, index) => {
        pdf.setDrawColor(214, 214, 214);
        pdf.rect(
          cx,
          cursor,
          cols[index],
          rowH
        );

        pdf.text(
          String(value),
          cx + cols[index] / 2,
          cursor + 2.25,
          {
            align: "center",
            maxWidth: cols[index] - 1.5,
          }
        );

        cx += cols[index];
      });

      cursor += rowH;
    });

    return cursor;
  }

  function drawPdfChart(x, y, w, h) {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(165, 165, 165);
    pdf.rect(x, y, w, h, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.4);
    pdf.setTextColor(20, 20, 20);

    pdf.text(
      "GRAFICO CARICO - SPOSTAMENTO",
      x + 2,
      y + 3.6
    );

    const allPoints = [
      ...chart1,
      ...chartScarico1,
      ...chart2,
    ].filter(
      (point) =>
        point &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
    );

    if (!allPoints.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(90, 90, 90);

      pdf.text(
        "Grafico disponibile dopo inserimento letture.",
        x + w / 2,
        y + h / 2,
        {
          align: "center",
        }
      );

      return;
    }

    const plotX = x + 15;
    const plotY = y + 12;
    const plotW = w - 21;
    const plotH = h - 16;

    const maxX =
      Number.isFinite(chartMaxX) && chartMaxX > 0
        ? chartMaxX
        : 1;

    const rawMaxY = Math.max(
      ...allPoints.map(
        (point) => Number(point.y) || 0
      ),
      0
    );

    const maxY = Math.max(rawMaxY + 0.1, 0.2);

    const divisionsX = 5;
    const divisionsY = 5;

    // Titolo dell'asse del carico in alto.
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.3);
    pdf.setTextColor(70, 70, 70);

    pdf.text(
      "Carico [kPa]",
      plotX + plotW / 2,
      y + 7,
      {
        align: "center",
      }
    );

    // Griglia.
    pdf.setLineWidth(0.15);
    pdf.setDrawColor(225, 225, 225);

    for (let i = 1; i <= divisionsX; i += 1) {
      const gridX =
        plotX + (plotW / divisionsX) * i;

      pdf.line(
        gridX,
        plotY,
        gridX,
        plotY + plotH
      );
    }

    for (let i = 1; i <= divisionsY; i += 1) {
      const gridY =
        plotY + (plotH / divisionsY) * i;

      pdf.line(
        plotX,
        gridY,
        plotX + plotW,
        gridY
      );
    }

    // Assi.
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(70, 70, 70);

    // Asse X in alto.
    pdf.line(
      plotX,
      plotY,
      plotX + plotW,
      plotY
    );

    // Asse Y a sinistra.
    pdf.line(
      plotX,
      plotY,
      plotX,
      plotY + plotH
    );

    const px = (point) =>
      plotX + (point.x / maxX) * plotW;

    // Zero in alto e spostamenti positivi
    // crescenti verso il basso.
    const py = (point) =>
      plotY + (point.y / maxY) * plotH;

    function drawSeries(
      points,
      color,
      dashed = false
    ) {
      if (!Array.isArray(points) || !points.length) {
        return;
      }

      const validPoints = points.filter(
        (point) =>
          point &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
      );

      if (!validPoints.length) {
        return;
      }

      pdf.setDrawColor(...color);
      pdf.setFillColor(...color);
      pdf.setLineWidth(dashed ? 0.65 : 0.45);

      pdf.setLineDashPattern(
        dashed ? [2.5, 1.5] : [],
        0
      );

      let previous = null;

      validPoints.forEach((point) => {
        const currentX = px(point);
        const currentY = py(point);

        if (previous) {
          pdf.line(
            previous.x,
            previous.y,
            currentX,
            currentY
          );
        }

        if (dashed) {
          pdf.circle(
            currentX,
            currentY,
            0.7,
            "S"
          );
        } else {
          pdf.circle(
            currentX,
            currentY,
            0.85,
            "F"
          );
        }

        previous = {
          x: currentX,
          y: currentY,
        };
      });

      pdf.setLineDashPattern([], 0);
      pdf.setLineWidth(0.2);
    }

    // Curve invariate.
    drawSeries(
      chart1,
      [40, 99, 180],
      false
    );

    drawSeries(
      chart2,
      [210, 110, 35],
      false
    );

    drawSeries(
      chartScarico1,
      [20, 115, 220],
      true
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(3.9);
    pdf.setTextColor(70, 70, 70);

    // Valori del carico sopra il grafico.
    for (let i = 0; i <= divisionsX; i += 1) {
      const value =
        (maxX / divisionsX) * i;

      const tickX =
        plotX + (plotW / divisionsX) * i;

      pdf.line(
        tickX,
        plotY,
        tickX,
        plotY + 1
      );

      pdf.text(
        String(Math.round(value)),
        tickX,
        plotY - 1.2,
        {
          align: "center",
        }
      );
    }

    // Spostamenti positivi:
    // 0,00 in alto e valori crescenti in basso.
    for (let i = 0; i <= divisionsY; i += 1) {
      const value =
        (maxY / divisionsY) * i;

      const tickY =
        plotY + (plotH / divisionsY) * i;

      pdf.line(
        plotX - 1,
        tickY,
        plotX,
        tickY
      );

      pdf.text(
        value.toFixed(2),
        plotX - 1.8,
        tickY + 1,
        {
          align: "right",
        }
      );
    }

    pdf.setFontSize(4.1);

    pdf.text(
      "Spostamento [mm]",
      x + 3.2,
      plotY + plotH / 2,
      {
        angle: 90,
        align: "center",
      }
    );

    // Legenda.
    pdf.setFontSize(4.4);

    pdf.setTextColor(40, 99, 180);

    pdf.text(
      "1 CICLO",
      x + w - 36,
      y + 3.6
    );

    pdf.text(
      "Scarico C1",
      x + w - 23,
      y + 3.6
    );

    pdf.setTextColor(210, 110, 35);

    pdf.text(
      "2 CICLO",
      x + w - 2,
      y + 3.6,
      {
        align: "right",
      }
    );
  }

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PW, PH, "F");

  let cursorY = CONTENT_Y;

  // HEADER
  try {
    const logo = await fetch("/logo-dismat.jpg")
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();

            reader.onloadend = () =>
              resolve(reader.result);

            reader.readAsDataURL(blob);
          })
      );

    pdf.addImage(
      logo,
      "JPEG",
      CONTENT_X,
      cursorY,
      14,
      14
    );
  } catch {
    // Il PDF resta valido anche senza logo.
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.6);
  pdf.setTextColor(0, 0, 0);

  pdf.text(
    "L A B O R A T O R I O   D I S M A T",
    CONTENT_X + 17,
    cursorY + 4.2
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.9);

  pdf.text(
    "Sperimentazione sulle Strutture e sui Materiali da Costruzione",
    CONTENT_X + 17,
    cursorY + 7.2
  );

  pdf.text(
    "CNR 146/92 - Prova di carico su piastra",
    CONTENT_X + 17,
    cursorY + 10
  );

  pdf.text(
    "Procedura interna DISMAT - IO 07-11-B",
    CONTENT_X + 17,
    cursorY + 12.6
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.2);

  pdf.text(
    "MINUTA DI PROVA",
    CONTENT_RIGHT,
    cursorY + 3.6,
    {
      align: "right",
    }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.1);

  pdf.text(
    "PROVA DI CARICO SU PIASTRA",
    CONTENT_RIGHT,
    cursorY + 6.6,
    {
      align: "right",
    }
  );

  pdf.text(
    `STRATO: ${layerLabel}`,
    CONTENT_RIGHT,
    cursorY + 9.6,
    {
      align: "right",
    }
  );

  pdf.setDrawColor(65, 65, 65);

  pdf.line(
    CONTENT_X,
    cursorY + 14,
    CONTENT_RIGHT,
    cursorY + 14
  );

  cursorY += 15;

  // DATI GENERALI + FOTO
  const leftW = 118;
  const gap = 5;
  const rightX = CONTENT_X + leftW + gap;
  const rightW = CONTENT_W - leftW - gap;

  const dataBodyY = section(
    CONTENT_X,
    cursorY,
    leftW,
    "DATI GENERALI"
  );

  section(
    rightX,
    cursorY,
    rightW,
    "FOTO PROVA"
  );

  const dataRowH = 5;
  const halfW = leftW / 2;

  const generalRows = [
    [
      "N. prova",
      verbale,
      "Data",
      dataProva,
    ],
    [
      "Cantiere",
      cantiere,
      "Committente",
      committente,
    ],
    [
      "Km",
      km || "-",
      "Sezione / Quota",
      `${sezione || "-"}${
        quota ? ` / ${quota}` : ""
      }`,
    ],
    [
      "Strato",
      layerLabel,
      "Diametro piastra",
      `${diametro || "-"} mm`,
    ],
    [
      "Tecnico esecutore",
      tecnico,
      "Presenti",
      presenti,
    ],
  ];

  generalRows.forEach((row, index) => {
    const y =
      dataBodyY + index * dataRowH;

    cell(
      CONTENT_X,
      y,
      halfW,
      dataRowH,
      row[0],
      row[1]
    );

    cell(
      CONTENT_X + halfW,
      y,
      halfW,
      dataRowH,
      row[2],
      row[3]
    );
  });

  const photoY = dataBodyY;
  const photoH = 56;

  pdf.setDrawColor(185, 185, 185);
  pdf.setFillColor(255, 255, 255);

  pdf.rect(
    rightX,
    photoY,
    rightW,
    photoH,
    "F"
  );

  pdf.rect(
    rightX,
    photoY,
    rightW,
    photoH
  );

  if (fotoProva) {
    try {
      pdf.addImage(
        fotoProva,
        "JPEG",
        rightX + 1,
        photoY + 1,
        rightW - 2,
        photoH - 2
      );
    } catch {
      pdf.setFontSize(5.2);

      pdf.text(
        "Foto non leggibile",
        rightX + rightW / 2,
        photoY + photoH / 2,
        {
          align: "center",
        }
      );
    }
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.2);
    pdf.setTextColor(90, 90, 90);

    pdf.text(
      "Foto prova non inserita",
      rightX + rightW / 2,
      photoY + photoH / 2,
      {
        align: "center",
      }
    );
  }

  const generalBottom =
    dataBodyY +
    generalRows.length * dataRowH;

  // FORMULE E NOTE NELLO SPAZIO
  // SOTTO I DATI GENERALI
  cursorY = generalBottom + 1.5;

  const notesW = leftW;

  const notesBodyY = section(
    CONTENT_X,
    cursorY,
    notesW,
    "FORMULE E NOTE"
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.3);
  pdf.setTextColor(0, 0, 0);

  pdf.text(
    "Md = (dp / ds) x D",
    CONTENT_X + 1.2,
    notesBodyY + 2.1
  );

  pdf.text(
    `Intervallo Md: ${
      testConfig?.md?.[0] ?? "-"
    } - ${
      testConfig?.md?.[1] ?? "-"
    } kPa`,
    CONTENT_X + 32,
    notesBodyY + 2.1
  );

  pdf.text(
    `Intervallo Md': ${
      testConfig?.mdp?.[0] ?? "-"
    } - ${
      testConfig?.mdp?.[1] ?? "-"
    } kPa`,
    CONTENT_X + 70,
    notesBodyY + 2.1
  );

  pdf.text(
    "Norma: CNR 146/92",
    CONTENT_X + 106,
    notesBodyY + 2.1
  );

  cursorY = notesBodyY + 4.7;

  // RISULTATI COMPATTI
  // SOTTO FORMULE E NOTE
  const RESULT_W = 70;

  const resultsBodyY = section(
    CONTENT_X,
    cursorY,
    RESULT_W,
    "RISULTATI"
  );

  const resultH = 7;
  const resultW = 18;
  const resultGap = 2;
  const resultsRowX = CONTENT_X + 4;

  cell(
    resultsRowX,
    resultsBodyY,
    resultW,
    resultH,
    "Md - 1 ciclo",
    md !== null && md !== undefined
      ? `${Number(md).toFixed(1)} MPa`
      : "-",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  cell(
    resultsRowX + resultW + resultGap,
    resultsBodyY,
    resultW,
    resultH,
    "Md' - 2 ciclo",
    mdp !== null && mdp !== undefined
      ? `${Number(mdp).toFixed(1)} MPa`
      : "-",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  cell(
    resultsRowX +
      2 * resultW +
      2 * resultGap,
    resultsBodyY,
    resultW,
    resultH,
    "Rapporto Md/Md'",
    rapporto !== null &&
      rapporto !== undefined
      ? Number(rapporto).toFixed(2)
      : "-",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  // LA TABELLA PARTE SOTTO
  // IL BLOCCO PIÃ™ BASSO
  cursorY =
    Math.max(
      photoY + photoH,
      resultsBodyY + resultH
    ) + 1.5;

  // TABELLA LETTURE
  cursorY =
    drawTable(
      CONTENT_X,
      cursorY,
      CONTENT_W
    ) + 1;

  // GRAFICO 19 x 4,8 cm
  drawPdfChart(
    CONTENT_X,
    cursorY,
    CONTENT_W,
    48
  );

  cursorY += 49.5;

  // FIRME SEPARATE SOTTO IL GRAFICO
  const signatureLineY = Math.min(
    cursorY + 8,
    CONTENT_BOTTOM - 5
  );

  if (firmaTecnico) {
    try {
      pdf.setFillColor(255, 255, 255);

      pdf.rect(
        CONTENT_X + 3,
        signatureLineY - 8,
        42,
        9,
        "F"
      );

      pdf.addImage(
        firmaTecnico,
        "PNG",
        CONTENT_X + 3,
        signatureLineY - 8,
        42,
        9
      );
    } catch {
      // Firma non leggibile.
    }
  }

  pdf.setDrawColor(175, 175, 175);

  pdf.line(
    CONTENT_X,
    signatureLineY,
    CONTENT_X + 72,
    signatureLineY
  );

 

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5);
  pdf.setTextColor(55, 55, 55);

  pdf.text(
    "Il tecnico esecutore",
    CONTENT_X,
    signatureLineY + 3.1
  );

 

  // BORDO AREA 19 x 19 cm
  pdf.setDrawColor(235, 235, 235);
  pdf.setLineWidth(0.1);

  pdf.rect(
    CONTENT_X,
    CONTENT_Y,
    CONTENT_W,
    CONTENT_H
  );

  // FOOTER FUORI DALL'AREA 19 x 19
  pdf.setDrawColor(100, 100, 100);

  pdf.line(
    CONTENT_X,
    PH - 13,
    CONTENT_RIGHT,
    PH - 13
  );

  pdf.setFontSize(5.2);
  pdf.setTextColor(90, 90, 90);

  pdf.text(
    "DISMAT - CNR 146/92 - Prova di carico su piastra",
    CONTENT_X,
    PH - 8
  );

  pdf.text(
    "Pagina 1/1",
    CONTENT_RIGHT,
    PH - 8,
    {
      align: "right",
    }
  );

  const safeDate =
    (dataProva || "").replace(/[/]/g, "-") ||
    new Date().toISOString().slice(0, 10);

  const filename =
    `Prova_Piastra_${
      verbale || "report"
    }_${safeDate}.pdf`;

  const blob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  if (preview) {
    const link =
      document.createElement("a");

    link.href = blobUrl;
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    pdf.save(filename);
  }

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 15000);
}
