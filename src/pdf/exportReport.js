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

  const layerLabel = String(testConfig?.label || "—").toUpperCase();
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

    const safeValue = String(value ?? "—");

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
    pdf.rect(x + cols[0], cursor, cols[1] + cols[2], groupH);
    pdf.rect(
      x + cols[0] + cols[1] + cols[2],
      cursor,
      cols[3] + cols[4],
      groupH
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(4.4);
    pdf.setTextColor(35, 35, 35);

    pdf.text("CARICO", x + cols[0] / 2, cursor + 2.75, {
      align: "center",
    });

    pdf.text(
      "1° CICLO",
      x + cols[0] + (cols[1] + cols[2]) / 2,
      cursor + 2.75,
      { align: "center" }
    );

    pdf.text(
      "2° CICLO",
      x +
        cols[0] +
        cols[1] +
        cols[2] +
        (cols[3] + cols[4]) / 2,
      cursor + 2.75,
      { align: "center" }
    );

    cursor += groupH;

    pdf.setFillColor(246, 246, 246);
    pdf.rect(x, cursor, w, headH, "F");

    let cx = x;

    heads.forEach((head, index) => {
      pdf.setDrawColor(210, 210, 210);
      pdf.rect(cx, cursor, cols[index], headH);

      pdf.text(head, cx + cols[index] / 2, cursor + 2.7, {
        align: "center",
      });

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
          : "—",
        s1 !== null && s1 !== undefined
          ? Number(s1).toFixed(3)
          : "—",
        r2 !== null && r2 !== undefined
          ? Number(r2).toFixed(2)
          : "—",
        s2 !== null && s2 !== undefined
          ? Number(s2).toFixed(3)
          : "—",
      ];

      values.forEach((value, index) => {
        pdf.setDrawColor(214, 214, 214);
        pdf.rect(cx, cursor, cols[index], rowH);

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
    pdf.text("GRAFICO CARICO - SPOSTAMENTO", x + 2, y + 3.6);

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
        { align: "center" }
      );

      return;
    }

    const plotX = x + 12;
    const plotY = y + 8;
    const plotW = w - 18;
    const plotH = h - 14;

    const maxX =
      Number.isFinite(chartMaxX) && chartMaxX > 0
        ? chartMaxX
        : 1;

    const rawMaxY = Math.max(...allPoints.map((point) => point.y), 0);
    const maxY = Math.max(rawMaxY + 0.1, 0.2);

    pdf.setLineWidth(0.15);
    pdf.setDrawColor(225, 225, 225);

    for (let i = 1; i <= 4; i += 1) {
      const gx = plotX + (plotW / 5) * i;
      const gy = plotY + (plotH / 5) * i;

      pdf.line(gx, plotY, gx, plotY + plotH);
      pdf.line(plotX, gy, plotX + plotW, gy);
    }

    pdf.setLineWidth(0.25);
    pdf.setDrawColor(70, 70, 70);

    pdf.line(plotX, plotY, plotX, plotY + plotH);
    pdf.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

    const px = (point) =>
      plotX + (point.x / maxX) * plotW;

    // In jsPDF la Y cresce verso il basso:
    // 0 in alto, valori maggiori in basso.
    const py = (point) =>
      plotY + (point.y / maxY) * plotH;

    function drawSeries(points, color, dashed = false) {
      if (!points.length) return;

      pdf.setDrawColor(...color);
      pdf.setFillColor(...color);
      pdf.setLineWidth(dashed ? 0.65 : 0.45);
      pdf.setLineDashPattern(
        dashed ? [2.5, 1.5] : [],
        0
      );

      let previous = null;

      points.forEach((point) => {
        const cx = px(point);
        const cy = py(point);

        if (previous) {
          pdf.line(previous.x, previous.y, cx, cy);
        }

        if (dashed) {
          pdf.circle(cx, cy, 0.75, "S");
        } else {
          pdf.circle(cx, cy, 0.9, "F");
        }

        previous = { x: cx, y: cy };
      });

      pdf.setLineDashPattern([], 0);
      pdf.setLineWidth(0.2);
    }

    drawSeries(chart1, [40, 99, 180], false);
    drawSeries(chart2, [210, 110, 35], false);

    // Disegnato per ultimo così resta visibile.
    drawSeries(chartScarico1, [20, 115, 220], true);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4.2);
    pdf.setTextColor(70, 70, 70);

    // Asse Y
    pdf.text("0", plotX - 1.5, plotY + 1.2, {
      align: "right",
    });

    pdf.text(
      maxY.toFixed(1),
      plotX - 1.5,
      plotY + plotH,
      { align: "right" }
    );

    // Asse X
    pdf.text("0", plotX, plotY + plotH + 3.1, {
      align: "center",
    });

    pdf.text(
      String(maxX),
      plotX + plotW,
      plotY + plotH + 3.1,
      { align: "center" }
    );

    pdf.text(
      "Carico [kPa]",
      plotX + plotW / 2,
      y + h - 1.6,
      { align: "center" }
    );

    pdf.text(
      "Spostamento [mm]",
      x + 3.2,
      plotY + plotH / 2,
      { angle: 90 }
    );

    pdf.setFontSize(4.4);

    pdf.setTextColor(40, 99, 180);
    pdf.text("1° ciclo", x + w - 36, y + 3.6);
    pdf.text("Scarico C1", x + w - 23, y + 3.6);

    pdf.setTextColor(210, 110, 35);
    pdf.text("2° ciclo", x + w - 2, y + 3.6, {
      align: "right",
    });
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
            reader.onloadend = () => resolve(reader.result);
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
    { align: "right" }
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.1);

  pdf.text(
    "PROVA DI CARICO SU PIASTRA",
    CONTENT_RIGHT,
    cursorY + 6.6,
    { align: "right" }
  );

  pdf.text(
    `STRATO: ${layerLabel}`,
    CONTENT_RIGHT,
    cursorY + 9.6,
    { align: "right" }
  );

  pdf.text(
    `N. PROVA: ${verbale || "—"}`,
    CONTENT_RIGHT,
    cursorY + 12.6,
    { align: "right" }
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
    ["N. prova", verbale, "Data", dataProva],
    ["Cantiere", cantiere, "Committente", committente],
    [
      "Km",
      km || "—",
      "Sezione / Quota",
      `${sezione || "—"}${quota ? ` / ${quota}` : ""}`,
    ],
    [
      "Strato",
      layerLabel,
      "Diametro piastra",
      `${diametro || "—"} mm`,
    ],
    [
      "Tecnico esecutore",
      tecnico,
      "Presenti",
      presenti,
    ],
  ];

  generalRows.forEach((row, index) => {
    const y = dataBodyY + index * dataRowH;

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
  const photoH = dataRowH * 5;

  pdf.setDrawColor(185, 185, 185);
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
        { align: "center" }
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
      { align: "center" }
    );
  }

  cursorY = dataBodyY + photoH + 1;

  // RISULTATI
  const resultsBodyY = section(
    CONTENT_X,
    cursorY,
    CONTENT_W,
    "RISULTATI"
  );

  const resultH = 7;
  const resultW = CONTENT_W / 3;

  cell(
    CONTENT_X,
    resultsBodyY,
    resultW,
    resultH,
    "Md - 1° ciclo",
    md !== null
      ? `${Number(md).toFixed(1)} MPa`
      : "—",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  cell(
    CONTENT_X + resultW,
    resultsBodyY,
    resultW,
    resultH,
    "Md' - 2° ciclo",
    mdp !== null
      ? `${Number(mdp).toFixed(1)} MPa`
      : "—",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  cell(
    CONTENT_X + 2 * resultW,
    resultsBodyY,
    resultW,
    resultH,
    "Rapporto Md/Md'",
    rapporto !== null
      ? Number(rapporto).toFixed(2)
      : "—",
    {
      align: "center",
      valueFontSize: 5.5,
    }
  );

  cursorY = resultsBodyY + resultH + 1;

  // TABELLA
  cursorY =
    drawTable(
      CONTENT_X,
      cursorY,
      CONTENT_W
    ) + 1;

  // FORMULE E NOTE
  const notesBodyY = section(
    CONTENT_X,
    cursorY,
    CONTENT_W,
    "FORMULE E NOTE"
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(4.5);
  pdf.setTextColor(0, 0, 0);

  pdf.text(
    "Md = (Δp / Δs) · D",
    CONTENT_X + 1.2,
    notesBodyY + 2.1
  );

  pdf.text(
    `Intervallo Md: ${testConfig.md[0]} - ${testConfig.md[1]} kPa`,
    CONTENT_X + 48,
    notesBodyY + 2.1
  );

  pdf.text(
    `Intervallo Md': ${testConfig.mdp[0]} - ${testConfig.mdp[1]} kPa`,
    CONTENT_X + 100,
    notesBodyY + 2.1
  );

  pdf.text(
    "Norma: CNR 146/92",
    CONTENT_X + 154,
    notesBodyY + 2.1
  );

  cursorY = notesBodyY + 5.2;

  // GRAFICO 190 x 60 mm
  drawPdfChart(
    CONTENT_X,
    cursorY,
    CONTENT_W,
    60
  );

  cursorY += 61.5;

  // FIRME
  const signatureLineY = Math.min(
    cursorY + 3.5,
    CONTENT_BOTTOM - 4.5
  );

  if (firmaTecnico) {
    try {
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

  pdf.line(
    CONTENT_RIGHT - 72,
    signatureLineY,
    CONTENT_RIGHT,
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

  pdf.text(
    "Direzione lavori / Committente",
    CONTENT_RIGHT - 72,
    signatureLineY + 3.1
  );

  // Bordo leggero dell'area 19 x 19 cm
  pdf.setDrawColor(235, 235, 235);
  pdf.setLineWidth(0.1);
  pdf.rect(
    CONTENT_X,
    CONTENT_Y,
    CONTENT_W,
    CONTENT_H
  );

  // FOOTER fuori dall'area 19 x 19
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
    { align: "right" }
  );

  const safeDate =
    (dataProva || "").replace(/[/]/g, "-") ||
    new Date().toISOString().slice(0, 10);

  const filename =
    `Prova_Piastra_${verbale || "report"}_${safeDate}.pdf`;

  const blob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  if (preview) {
    const link = document.createElement("a");
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